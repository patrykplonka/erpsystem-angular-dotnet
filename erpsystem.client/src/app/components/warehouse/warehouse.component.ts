import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-warehouse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse.component.html',
  styleUrls: ['./warehouse.component.css']
})
export class WarehouseComponent implements OnInit {
  warehouseItems: WarehouseItemDto[] = [];
  deletedItems: WarehouseItemDto[] = [];
  newItem: CreateWarehouseItemDto = { name: '', code: '', quantity: null, price: null, category: '', location: '', createdBy: '' };
  editItem: UpdateWarehouseItemDto | null = null;
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  showDeleted: boolean = false;
  showAddForm: boolean = false;
  nameFilter: string = '';
  minQuantityFilter: number | null = null;
  maxQuantityFilter: number | null = null;
  minPriceFilter: number | null = null;
  maxPriceFilter: number | null = null;
  categoryFilter: string = '';
  locationFilter: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  selectedItemId: number | null = null;
  movements: WarehouseMovement[] = [];
  newMovement: CreateWarehouseMovementDto = {
    warehouseItemId: 0,
    movementType: 'Przyjęcie',
    quantity: 0,
    supplier: '',
    documentNumber: '',
    description: '',
    status: 'Zakończone',
    createdBy: '',
    date: '',
    comment: ''
  };
  showMovements: boolean = false;
  availableLocations: Location[] = [];
  operationLogs: OperationLog[] = [];
  showHistory: boolean = false;
  historyUserFilter: string = '';
  historyStartDateFilter: string = '';
  historyEndDateFilter: string = '';
  historyItemFilter: string = '';
  lowStockThreshold: number = 5;
  notifications: string[] = [];
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  movementSortField: string = '';
  movementSortDirection: 'asc' | 'desc' = 'asc';
  historySortField: string = '';
  historySortDirection: 'asc' | 'desc' = 'asc';
  lowStockFilter: boolean = false;
  maxQuantity: number = 0;
  uniqueCategories: string[] = [];
  movementTypeFilter: string = '';
  movementStatusFilter: string = '';
  movementMinQuantityFilter: number | null = null;
  movementMaxQuantityFilter: number | null = null;
  movementStartDateFilter: string = '';
  movementEndDateFilter: string = '';
  movementUserFilter: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private movementService: WarehouseMovementsService
  ) { }

  ngOnInit() {
    this.loadItems();
    this.loadLocations();
    this.loadOperationLogs();
    this.loadLowStockItems();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateForApi(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString();
  }

  loadLocations() {
    this.http.get<Location[]>('https://localhost:7224/api/locations').subscribe(
      data => this.availableLocations = data,
      error => this.errorMessage = `Błąd ładowania lokalizacji: ${error.status} ${error.message}`
    );
  }

  loadOperationLogs() {
    this.http.get<OperationLog[]>('https://localhost:7224/api/warehouse/operation-logs').subscribe(
      data => this.operationLogs = data,
      error => this.errorMessage = `Błąd ładowania historii: ${error.status} ${error.message}`
    );
  }

  loadLowStockItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse/low-stock').subscribe(
      data => {
        this.notifications = data.map(item => `Niski stan magazynowy: ${item.name} (Ilość: ${item.quantity})`);
      },
      error => this.errorMessage = `Błąd ładowania niskich stanów: ${error.status} ${error.message}`
    );
  }

  checkLowStock() {
    this.notifications = this.warehouseItems
      .filter(item => item.quantity <= this.lowStockThreshold)
      .map(item => `Niski stan magazynowy: ${item.name} (Ilość: ${item.quantity})`);
  }

  applyFilters() {
    this.checkLowStock();
  }

  updateItemMovementsInfo() {
    this.warehouseItems.forEach(item => {
      this.movementService.getMovementsByItem(item.id).subscribe(movements => {
        item.movementFrequency = movements.length;
        item.lastMovementDate = movements.length > 0 ? this.formatDate(movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date) : undefined;
      });
    });
  }

  get filteredItems(): WarehouseItemDto[] {
    const items = this.showDeleted ? this.deletedItems : this.warehouseItems;
    let filtered = items.filter(item => {
      const matchesNameOrCode = !this.nameFilter ||
        item.name.toLowerCase().includes(this.nameFilter.toLowerCase()) ||
        item.code.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesMinQuantity = this.minQuantityFilter === null || item.quantity >= this.minQuantityFilter;
      const matchesMaxQuantity = this.maxQuantityFilter === null || item.quantity <= this.maxQuantityFilter;
      const matchesMinPrice = this.minPriceFilter === null || item.price >= this.minPriceFilter;
      const matchesMaxPrice = this.maxPriceFilter === null || item.price <= this.maxPriceFilter;
      const matchesCategory = !this.categoryFilter ||
        item.category === this.categoryFilter;
      const matchesLocation = !this.locationFilter ||
        item.location === this.locationFilter;
      const matchesLowStock = !this.lowStockFilter || item.quantity <= this.lowStockThreshold;
      return matchesNameOrCode && matchesMinQuantity && matchesMaxQuantity && matchesMinPrice && matchesMaxPrice && matchesCategory && matchesLocation && matchesLowStock;
    });

    if (this.sortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.sortField as keyof WarehouseItemDto];
        const valueB = b[this.sortField as keyof WarehouseItemDto];
        if (this.sortField === 'lastMovementDate') {
          const dateA = valueA ? new Date(valueA as string).getTime() : 0;
          const dateB = valueB ? new Date(valueB as string).getTime() : 0;
          return this.sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (this.sortField === 'movementFrequency') {
          const freqA = (valueA as number | undefined) ?? 0;
          const freqB = (valueB as number | undefined) ?? 0;
          return this.sortDirection === 'asc' ? freqA - freqB : freqB - freqA;
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }

    return filtered;
  }

  get filteredMovements(): WarehouseMovement[] {
    let filtered = this.movements.filter(m => {
      const matchesType = !this.movementTypeFilter ||
        m.movementType.toLowerCase().includes(this.movementTypeFilter.toLowerCase());
      const matchesStatus = !this.movementStatusFilter ||
        m.status.toLowerCase().includes(this.movementStatusFilter.toLowerCase());
      const matchesMinQuantity = this.movementMinQuantityFilter === null || m.quantity >= this.movementMinQuantityFilter;
      const matchesMaxQuantity = this.movementMaxQuantityFilter === null || m.quantity <= this.movementMaxQuantityFilter;
      const matchesStartDate = !this.movementStartDateFilter ||
        new Date(m.date).getTime() >= new Date(this.movementStartDateFilter).getTime();
      const matchesEndDate = !this.movementEndDateFilter ||
        new Date(m.date).getTime() <= new Date(this.movementEndDateFilter).getTime();
      const matchesUser = !this.movementUserFilter ||
        m.createdBy.toLowerCase().includes(this.movementUserFilter.toLowerCase());
      return matchesType && matchesStatus && matchesMinQuantity && matchesMaxQuantity && matchesStartDate && matchesEndDate && matchesUser;
    });

    if (this.movementSortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.movementSortField as keyof WarehouseMovement];
        const valueB = b[this.movementSortField as keyof WarehouseMovement];
        if (this.movementSortField === 'date') {
          return this.movementSortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.movementSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.movementSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }

    return filtered;
  }

  applyHistoryFilters() {
    this.sortHistory(this.historySortField);
  }

  get filteredOperationLogs(): OperationLog[] {
    let filtered = this.operationLogs.filter(log => {
      const matchesUser = !this.historyUserFilter ||
        log.user.toLowerCase().includes(this.historyUserFilter.toLowerCase());
      const matchesStartDate = !this.historyStartDateFilter ||
        new Date(log.timestamp).getTime() >= new Date(this.historyStartDateFilter).getTime();
      const matchesEndDate = !this.historyEndDateFilter ||
        new Date(log.timestamp).getTime() <= new Date(this.historyEndDateFilter).getTime();
      const matchesItem = !this.historyItemFilter ||
        log.itemName.toLowerCase().includes(this.historyItemFilter.toLowerCase()) ||
        log.itemId.toString().includes(this.historyItemFilter);
      return matchesUser && matchesStartDate && matchesEndDate && matchesItem;
    });

    if (this.historySortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.historySortField as keyof OperationLog];
        const valueB = b[this.historySortField as keyof OperationLog];
        if (this.historySortField === 'timestamp') {
          return this.historySortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.historySortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }
        return 0;
      });
    }

    return filtered;
  }

  loadItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse').subscribe(
      data => {
        this.warehouseItems = data;
        this.checkLowStock();
        this.updateItemMovementsInfo();
        this.maxQuantity = Math.max(...this.warehouseItems.map(item => item.quantity), 100);
        this.uniqueCategories = [...new Set(this.warehouseItems.map(item => item.category))];
      },
      error => this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}`
    );
  }

  loadDeletedItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse/deleted').subscribe(
      data => {
        this.deletedItems = data;
      },
      error => this.errorMessage = `Błąd ładowania usuniętych produktów: ${error.status} ${error.message}`
    );
  }

  syncMovementQuantity() {
    this.newMovement.quantity = this.newItem.quantity ?? 0;
  }

  addItemWithMovement() {
    if (!this.newItem.name || !this.newItem.code || this.newItem.quantity === null || this.newItem.price === null || !this.newItem.category || !this.newItem.location) {
      this.errorMessage = 'Wszystkie pola produktu są wymagane.';
      return;
    }
    if (this.newItem.quantity < 0 || this.newItem.price < 0) {
      this.errorMessage = 'Ilość i cena nie mogą być ujemne.';
      return;
    }
    if (!this.newMovement.supplier || !this.newMovement.documentNumber) {
      this.errorMessage = 'Dostawca i numer dokumentu są wymagane dla pierwszego przyjęcia.';
      return;
    }
    const itemToSend: CreateWarehouseItemDto = {
      ...this.newItem,
      quantity: this.newItem.quantity ?? 0,
      price: this.newItem.price ?? 0,
      location: this.newItem.location || 'Brak',
      createdBy: this.currentUserFullName
    };
    this.http.post<WarehouseItemDto>('https://localhost:7224/api/warehouse', itemToSend).subscribe(
      response => {
        this.successMessage = `Dodano produkt: ${response.name}`;
        this.errorMessage = null;
        const movementToSend: CreateWarehouseMovementDto = {
          ...this.newMovement,
          warehouseItemId: response.id,
          quantity: this.newItem.quantity ?? 0,
          createdBy: this.currentUserFullName,
          date: this.formatDateForApi(new Date())
        };
        this.movementService.createMovement(movementToSend).subscribe(
          () => {
            this.successMessage += ' oraz zarejestrowano przyjęcie.';
            this.loadItems();
            this.loadOperationLogs();
            this.toggleAddForm();
            this.newMovement = {
              warehouseItemId: 0,
              movementType: 'Przyjęcie',
              quantity: 0,
              supplier: '',
              documentNumber: '',
              description: '',
              status: 'Zakończone',
              createdBy: this.currentUserFullName,
              date: '',
              comment: ''
            };
          },
          error => {
            this.errorMessage = `Błąd dodawania ruchu: ${error.status} ${error.message}`;
          }
        );
      },
      error => {
        this.errorMessage = `Błąd dodawania produktu: ${error.status} ${error.message}`;
      }
    );
  }

  deleteItem(id: number) {
    this.http.delete(`https://localhost:7224/api/warehouse/${id}`, {
      body: { createdBy: this.currentUserFullName }
    }).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        if (this.showDeleted) this.loadDeletedItems();
      },
      error => this.errorMessage = `Błąd usuwania produktu: ${error.status} ${error.message}`
    );
  }

  restoreItem(id: number) {
    this.http.post(`https://localhost:7224/api/warehouse/restore/${id}`, { createdBy: this.currentUserFullName }).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        this.loadDeletedItems();
      },
      error => this.errorMessage = `Błąd przywracania produktu: ${error.status} ${error.message}`
    );
  }

  startEdit(item: WarehouseItemDto) {
    this.editItem = { ...item };
  }

  updateItem() {
    if (this.editItem) {
      if (!this.editItem.name || !this.editItem.code || this.editItem.quantity === null || this.editItem.price === null || !this.editItem.category || !this.editItem.location) {
        this.errorMessage = 'Wszystkie pola są wymagane.';
        return;
      }
      if (this.editItem.quantity < 0 || this.editItem.price < 0) {
        this.errorMessage = 'Ilość i cena nie mogą być ujemne.';
        return;
      }
      const updatedItem = { ...this.editItem, createdBy: this.currentUserFullName };
      this.http.put(`https://localhost:7224/api/warehouse/${this.editItem.id}`, updatedItem).subscribe(
        () => {
          this.successMessage = `Zaktualizowano produkt: ${this.editItem!.name}`;
          this.errorMessage = null;
          this.loadItems();
          this.loadOperationLogs();
          this.editItem = null;
        },
        error => this.errorMessage = error.error || `Błąd aktualizacji produktu: ${error.status} ${error.message}`
      );
    }
  }

  cancelEdit() {
    this.editItem = null;
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    if (this.showDeleted) {
      this.loadDeletedItems();
    } else {
      this.loadItems();
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.errorMessage = null;
    this.successMessage = null;
    if (!this.showAddForm) {
      this.newItem = { name: '', code: '', quantity: null, price: null, category: '', location: '', createdBy: this.currentUserFullName };
      this.newMovement = {
        warehouseItemId: 0,
        movementType: 'Przyjęcie',
        quantity: 0,
        supplier: '',
        documentNumber: '',
        description: '',
        status: 'Zakończone',
        createdBy: this.currentUserFullName,
        date: '',
        comment: ''
      };
    }
  }

  toggleHistoryView() {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.loadOperationLogs();
    }
  }

  goToWarehouse() {
    this.router.navigate(['/warehouse']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleMovements(itemId: number) {
    if (this.selectedItemId === itemId && this.showMovements) {
      this.showMovements = false;
      this.selectedItemId = null;
    } else {
      this.selectedItemId = itemId;
      this.showMovements = true;
      this.loadMovements(itemId);
      this.newMovement.warehouseItemId = itemId;
      this.newMovement.createdBy = this.currentUserFullName;
    }
  }

  loadMovements(itemId: number) {
    this.movementService.getMovementsByItem(itemId).subscribe(
      data => {
        this.movements = data.map(movement => ({
          ...movement,
          date: this.formatDate(movement.date)
        }));
      },
      error => this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`
    );
  }

  addMovement() {
    if (this.newMovement.quantity <= 0) {
      this.errorMessage = 'Ilość musi być większa niż 0.';
      return;
    }
    if (!this.newMovement.movementType || !this.newMovement.status) {
      this.errorMessage = 'Typ ruchu i status są wymagane.';
      return;
    }
    this.newMovement.date = this.formatDateForApi(new Date());
    this.newMovement.createdBy = this.currentUserFullName;
    this.newMovement.comment = this.newMovement.comment !== undefined ? this.newMovement.comment : '';
    this.movementService.createMovement(this.newMovement).subscribe(
      () => {
        this.successMessage = 'Ruch magazynowy dodany.';
        this.errorMessage = null;
        this.loadMovements(this.newMovement.warehouseItemId);
        this.loadItems();
        this.loadOperationLogs();
        this.newMovement = {
          warehouseItemId: this.newMovement.warehouseItemId,
          movementType: 'Przyjęcie',
          quantity: 0,
          supplier: '',
          documentNumber: '',
          description: '',
          status: 'Zakończone',
          createdBy: this.currentUserFullName,
          date: '',
          comment: ''
        };
      },
      error => {
        if (error.status === 400 && error.error === 'Niewystarczająca ilość na magazynie') {
          this.errorMessage = `Niewystarczająca ilość na magazynie dla produktu ID ${this.newMovement.warehouseItemId}.`;
        } else {
          this.errorMessage = error.error || `Błąd dodawania ruchu: ${error.status} ${error.message}`;
        }
      }
    );
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const text = e.target.result as string;
        const data = this.parseCSV(text);
        this.processBulkMovements(data);
      };
      reader.readAsText(file);
    }
  }

  parseCSV(csv: string): any[] {
    const lines = csv.split('\n');
    const result: any[] = [];
    const headers = lines[0].split(',').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"(.+)"$/, '$1'));
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        result.push(obj);
      }
    }
    return result;
  }

  processBulkMovements(data: any[]) {
    const movements = data.map(row => {
      let movementType = row.movementType;
      if (movementType === 'Receipt') movementType = 'Przyjęcie';
      if (movementType === 'Issue') movementType = 'Wydanie';
      if (movementType === 'Production') movementType = 'Produkcja';
      let status = row.status || 'Zakończone';
      if (status === 'Planned') status = 'Zaplanowane';
      if (status === 'InProgress') status = 'W trakcie';
      if (status === 'Completed') status = 'Zakończone';
      return {
        warehouseItemId: parseInt(row.warehouseItemId, 10),
        movementType: movementType,
        quantity: parseInt(row.quantity, 10),
        supplier: row.supplier || '',
        documentNumber: row.documentNumber || '',
        description: row.description || '',
        createdBy: this.currentUserFullName,
        status: status,
        comment: row.comment || '',
        date: this.formatDateForApi(new Date())
      };
    });
    movements.forEach(movement => {
      this.movementService.createMovement(movement).subscribe(
        () => {
          this.loadMovements(movement.warehouseItemId);
          this.loadItems();
          this.loadOperationLogs();
        },
        error => {
          if (error.status === 400 && error.error === 'Niewystarczająca ilość na magazynie') {
            this.errorMessage = `Błąd dla produktu ID ${movement.warehouseItemId}: Niewystarczająca ilość na magazynie.`;
          } else {
            this.errorMessage = `Błąd podczas masowego dodawania: ${error.status} - ${error.statusText}. Szczegóły: ${error.error || 'Brak szczegółów'}`;
          }
        }
      );
    });
    this.successMessage = 'Masowe dodawanie ruchów zakończone.';
  }

  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(this.filteredOperationLogs.map(log => ({
      ID: log.id,
      Użytkownik: log.user,
      Operacja: log.operation,
      Produkt: log.itemName,
      'ID Produktu': log.itemId,
      Data: this.formatDate(log.timestamp),
      Szczegóły: log.details
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operation Logs');
    XLSX.writeFile(workbook, 'warehouse_operation_logs.xlsx');
  }

  sortItems(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  sortMovements(field: string) {
    if (this.movementSortField === field) {
      this.movementSortDirection = this.movementSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.movementSortField = field;
      this.movementSortDirection = 'asc';
    }
  }

  sortHistory(field: string) {
    if (this.historySortField === field) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.historySortField = field;
      this.historySortDirection = 'asc';
    }
    this.applyHistoryFilters();
  }
}

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
  lastMovementDate?: string;
  movementFrequency?: number;
}

interface CreateWarehouseItemDto {
  name: string;
  code: string;
  quantity: number | null;
  price: number | null;
  category: string;
  location: string;
  createdBy: string;
}

interface UpdateWarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
  createdBy?: string;
}

interface Location {
  id: number;
  name: string;
}

interface OperationLog {
  id: number;
  user: string;
  operation: string;
  itemId: number;
  itemName: string;
  timestamp: string;
  details: string;
}

interface WarehouseMovement {
  id: number;
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  date: string;
  createdBy: string;
  status: 'Zaplanowane' | 'W trakcie' | 'Zakończone';
  comment?: string;
}

interface CreateWarehouseMovementDto {
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  status: 'Zaplanowane' | 'W trakcie' | 'Zakończone';
  createdBy: string;
  date: string;
  comment?: string;
}
