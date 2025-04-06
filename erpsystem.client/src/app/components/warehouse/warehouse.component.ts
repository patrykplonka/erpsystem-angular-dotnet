import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import * as XLSX from 'xlsx';

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
}

interface CreateWarehouseItemDto {
  name: string;
  code: string;
  quantity: number | null;
  price: number | null;
  category: string;
  location: string;
}

interface UpdateWarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
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
  newItem: CreateWarehouseItemDto = { name: '', code: '', quantity: null, price: null, category: '', location: '' };
  editItem: UpdateWarehouseItemDto | null = null;
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  showDeleted: boolean = false;
  showAddForm: boolean = false;
  nameFilter: string = '';
  quantityFilter: number | null = null;
  priceFilter: number | null = null;
  categoryFilter: string = '';
  locationFilter: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  selectedItemId: number | null = null;
  movements: any[] = [];
  newMovement: any = { warehouseItemId: 0, movementType: 'Receipt', quantity: 0, description: '', createdBy: '' };
  showMovements: boolean = false;
  availableLocations: Location[] = [];
  selectedLocation: string = '';
  showMoveForm: boolean = false;
  itemToMoveId: number | null = null;
  operationLogs: OperationLog[] = [];
  showHistory: boolean = false;
  historyUserFilter: string = '';
  historyDateFilter: string = '';
  historyItemFilter: string = '';
  lowStockThreshold: number = 5;
  notifications: string[] = []; 

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
    this.newMovement.createdBy = this.currentUserFullName;
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
    this.notifications = [];
    this.warehouseItems.forEach(item => {
      if (item.quantity <= this.lowStockThreshold) {
        this.notifications.push(`Niski stan magazynowy: ${item.name} (Ilość: ${item.quantity})`);
      }
    });
  }

  get filteredItems(): WarehouseItemDto[] {
    const items = this.showDeleted ? this.deletedItems : this.warehouseItems;
    return items.filter(item => {
      const matchesNameOrCode = !this.nameFilter ||
        item.name.toLowerCase().includes(this.nameFilter.toLowerCase()) ||
        item.code.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesQuantity = this.quantityFilter === null || item.quantity === this.quantityFilter;
      const matchesPrice = this.priceFilter === null || item.price === this.priceFilter;
      const matchesCategory = !this.categoryFilter ||
        item.category.toLowerCase().includes(this.categoryFilter.toLowerCase());
      const matchesLocation = !this.locationFilter ||
        item.location.toLowerCase().includes(this.locationFilter.toLowerCase());
      return matchesNameOrCode && matchesQuantity && matchesPrice && matchesCategory && matchesLocation;
    });
  }

  get filteredOperationLogs(): OperationLog[] {
    return this.operationLogs.filter(log => {
      const matchesUser = !this.historyUserFilter ||
        log.user.toLowerCase().includes(this.historyUserFilter.toLowerCase());
      const matchesDate = !this.historyDateFilter ||
        new Date(log.timestamp).toISOString().slice(0, 10) === this.historyDateFilter;
      const matchesItem = !this.historyItemFilter ||
        log.itemName.toLowerCase().includes(this.historyItemFilter.toLowerCase()) ||
        log.itemId.toString().includes(this.historyItemFilter);
      return matchesUser && matchesDate && matchesItem;
    });
  }

  loadItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse').subscribe(
      data => {
        this.warehouseItems = data;
        this.checkLowStock();
      },
      error => this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}`
    );
  }

  loadDeletedItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse/deleted').subscribe(
      data => this.deletedItems = data,
      error => this.errorMessage = `Błąd ładowania usuniętych produktów: ${error.status} ${error.message}`
    );
  }

  addItem() {
    if (!this.newItem.name || !this.newItem.code || this.newItem.quantity === null || this.newItem.price === null || !this.newItem.category || !this.newItem.location) {
      this.errorMessage = 'Wszystkie pola są wymagane.';
      return;
    }
    if (this.newItem.quantity < 0 || this.newItem.price < 0) {
      this.errorMessage = 'Ilość i cena nie mogą być ujemne.';
      return;
    }
    const itemToSend = { ...this.newItem, quantity: this.newItem.quantity ?? 0, price: this.newItem.price ?? 0, location: this.newItem.location || 'Brak' };
    this.http.post<WarehouseItemDto>('https://localhost:7224/api/warehouse', itemToSend).subscribe(
      response => {
        this.successMessage = `Dodano produkt: ${response.name}`;
        this.errorMessage = null;
        this.loadItems();
        this.loadOperationLogs();
        this.newItem = { name: '', code: '', quantity: null, price: null, category: '', location: '' };
        this.showAddForm = false;
      },
      error => this.errorMessage = error.error || `Błąd dodawania produktu: ${error.status} ${error.message}`
    );
  }

  deleteItem(id: number) {
    this.http.delete(`https://localhost:7224/api/warehouse/${id}`).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        if (this.showDeleted) this.loadDeletedItems();
      },
      error => this.errorMessage = `Błąd usuwania produktu: ${error.status} ${error.message}`
    );
  }

  restoreItem(id: number) {
    this.http.post(`https://localhost:7224/api/warehouse/restore/${id}`, {}).subscribe(
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
      if (!this.editItem.name || !this.editItem.code || !this.editItem.quantity || !this.editItem.price || !this.editItem.category || !this.editItem.location) {
        this.errorMessage = 'Wszystkie pola są wymagane.';
        return;
      }
      this.http.put(`https://localhost:7224/api/warehouse/${this.editItem.id}`, this.editItem).subscribe(
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

  moveItem(id: number, newLocation: string) {
    if (!newLocation) {
      this.errorMessage = 'Proszę wybrać nową lokalizację.';
      return;
    }
    const payload = { newLocation, createdBy: this.currentUserFullName };
    this.http.post(`https://localhost:7224/api/warehouse/move/${id}`, payload).subscribe(
      () => {
        this.successMessage = 'Produkt został przeniesiony.';
        this.errorMessage = null;
        this.loadItems();
        this.loadOperationLogs();
        this.showMoveForm = false;
        this.itemToMoveId = null;
        this.selectedLocation = '';
      },
      error => this.errorMessage = error.error || `Błąd przenoszenia produktu: ${error.status} ${error.message}`
    );
  }

  startMove(id: number) {
    this.itemToMoveId = id;
    this.showMoveForm = true;
    this.selectedLocation = '';
  }

  cancelMove() {
    this.showMoveForm = false;
    this.itemToMoveId = null;
    this.selectedLocation = '';
  }

  submitMove() {
    if (this.itemToMoveId !== null) {
      this.moveItem(this.itemToMoveId, this.selectedLocation);
    }
  }

  cancelEdit() {
    this.editItem = null;
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    if (this.showDeleted) {
      this.loadDeletedItems();
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.errorMessage = null;
    this.successMessage = null;
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
      data => this.movements = data,
      error => this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`
    );
  }

  addMovement() {
    if (this.newMovement.quantity <= 0) {
      this.errorMessage = 'Ilość musi być większa niż 0.';
      return;
    }
    if (!this.newMovement.movementType) {
      this.errorMessage = 'Typ ruchu jest wymagany.';
      return;
    }
    this.movementService.createMovement(this.newMovement).subscribe(
      () => {
        this.successMessage = 'Ruch magazynowy dodany.';
        this.errorMessage = null;
        this.loadMovements(this.newMovement.warehouseItemId);
        this.loadItems();
        this.loadOperationLogs();
        this.newMovement = {
          warehouseItemId: this.newMovement.warehouseItemId,
          movementType: 'Receipt',
          quantity: 0,
          description: '',
          createdBy: this.currentUserFullName
        };
      },
      error => {
        if (error.status === 400 && error.error.includes('Za mało towaru')) {
          this.errorMessage = error.error;
        } else {
          this.errorMessage = error.error || `Błąd dodawania ruchu: ${error.status} ${error.message}`;
        }
      }
    );
  }

  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(this.filteredOperationLogs.map(log => ({
      ID: log.id,
      Użytkownik: log.user === "System" ? this.currentUserFullName : log.user,
      Operacja: log.operation,
      Produkt: log.itemName,
      'ID Produktu': log.itemId,
      Data: new Date(log.timestamp).toLocaleString(),
      Szczegóły: log.details
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operation Logs');
    XLSX.writeFile(workbook, 'warehouse_operation_logs.xlsx');
  }
}
