import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  newItem: CreateWarehouseItemDto = {
    name: '',
    code: '',
    quantity: null,
    price: null,
    category: '',
    location: ''
  };
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

  selectedItemId: number | null = null;
  movements: any[] = [];
  newMovement: any = {
    warehouseItemId: 0,
    movementType: 'Receipt',
    quantity: 0,
    description: '',
    createdBy: ''
  };
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
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
    this.newMovement.createdBy = this.currentUserFullName;
    console.log('ngOnInit - currentUserEmail:', this.currentUserEmail);
    console.log('ngOnInit - currentUserFullName:', this.currentUserFullName);
    console.log('ngOnInit - newMovement:', this.newMovement);
  }

  loadLocations() {
    this.http.get<Location[]>('https://localhost:7224/api/locations').subscribe(
      data => this.availableLocations = data,
      error => console.error('Error loading locations', error.status, error.message)
    );
  }

  loadOperationLogs() {
    this.http.get<OperationLog[]>('https://localhost:7224/api/warehouse/operation-logs').subscribe(
      data => this.operationLogs = data,
      error => console.error('Error loading operation logs', error.status, error.message)
    );
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
      data => this.warehouseItems = data,
      error => console.error('Error loading warehouse items', error.status, error.message)
    );
  }

  loadDeletedItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse/deleted').subscribe(
      data => this.deletedItems = data,
      error => console.error('Error loading deleted items', error.status, error.message)
    );
  }

  addItem() {
    const itemToSend = {
      ...this.newItem,
      quantity: this.newItem.quantity ?? 0,
      price: this.newItem.price ?? 0,
      location: this.newItem.location || 'Brak'
    };
    this.http.post<WarehouseItemDto>('https://localhost:7224/api/warehouse', itemToSend).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        this.newItem = { name: '', code: '', quantity: null, price: null, category: '', location: '' };
        this.showAddForm = false;
      },
      error => console.error('Error adding item', error.status, error.message)
    );
  }

  deleteItem(id: number) {
    this.http.delete(`https://localhost:7224/api/warehouse/${id}`).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        if (this.showDeleted) this.loadDeletedItems();
      },
      error => console.error('Error deleting item', error.status, error.message)
    );
  }

  restoreItem(id: number) {
    this.http.post(`https://localhost:7224/api/warehouse/restore/${id}`, {}).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        this.loadDeletedItems();
      },
      error => console.error('Error restoring item', error.status, error.message)
    );
  }

  startEdit(item: WarehouseItemDto) {
    this.editItem = { ...item };
  }

  updateItem() {
    if (this.editItem) {
      this.http.put(`https://localhost:7224/api/warehouse/${this.editItem.id}`, this.editItem).subscribe(
        () => {
          this.loadItems();
          this.loadOperationLogs();
          this.editItem = null;
        },
        error => console.error('Error updating item', error.status, error.message)
      );
    }
  }

  moveItem(id: number, newLocation: string) {
    if (!newLocation) {
      alert('Proszę wybrać nową lokalizację.');
      return;
    }
    this.http.post(`https://localhost:7224/api/warehouse/move/${id}`, { newLocation }).subscribe(
      () => {
        this.loadItems();
        this.loadOperationLogs();
        this.showMoveForm = false;
        this.itemToMoveId = null;
        this.selectedLocation = '';
      },
      error => console.error('Error moving item', error.status, error.message)
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
      console.log('toggleMovements - newMovement:', this.newMovement);
    }
  }

  loadMovements(itemId: number) {
    this.movementService.getMovementsByItem(itemId).subscribe(
      data => this.movements = data,
      error => console.error('Error loading movements', error)
    );
  }

  addMovement() {
    if (this.newMovement.warehouseItemId <= 0) {
      alert('Proszę wybrać poprawny element magazynu.');
      return;
    }
    if (this.newMovement.quantity <= 0) {
      alert('Ilość musi być większa niż 0.');
      return;
    }
    if (!this.newMovement.movementType) {
      alert('Typ ruchu jest wymagany.');
      return;
    }
    if (!this.newMovement.createdBy || this.newMovement.createdBy === 'Unknown') {
      alert('Nie udało się pobrać danych użytkownika. Zaloguj się ponownie.');
      return;
    }

    console.log('addMovement - Sending movement:', this.newMovement);

    this.movementService.createMovement(this.newMovement).subscribe(
      () => {
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
        console.log('addMovement - After reset, newMovement:', this.newMovement);
      },
      error => {
        console.error('Error adding movement:', error);
        alert('Wystąpił błąd podczas dodawania ruchu. Sprawdź konsolę dla szczegółów.');
      }
    );
  }

  exportToPDF() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont("times", "normal");

    const headers = ['ID', 'Użytkownik', 'Operacja', 'Produkt', 'Data', 'Szczegóły'];
    const data = this.filteredOperationLogs.map(log => [
      log.id,
      log.user,
      log.operation,
      `${log.itemName} (ID: ${log.itemId})`,
      new Date(log.timestamp).toLocaleString(),
      log.details
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 10 },
      styles: {
        font: 'times', // Użyj "times"
        fontStyle: 'normal',
        overflow: 'linebreak',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 },
        5: { cellWidth: 50 }
      },
      // Dodaj hook do ręcznej korekty tekstu, jeśli potrzebne
      didParseCell: (data) => {
        // Możesz tutaj ręcznie poprawić tekst, jeśli znaki są niepoprawne
        if (data.cell.text) {
          data.cell.text = data.cell.text.map(text =>
            text
              .replace(/ł/g, 'ł') // Teoretycznie niepotrzebne, ale dla pewności
              .replace(/ę/g, 'ę')
              .replace(/ś/g, 'ś')
              .replace(/ć/g, 'ć')
              .replace(/ź/g, 'ź')
              .replace(/ż/g, 'ż')
              .replace(/ą/g, 'ą')
              .replace(/ó/g, 'ó')
              .replace(/ń/g, 'ń')
          );
        }
      }
    });

    doc.save('warehouse_operation_logs.pdf');
  }

  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(this.filteredOperationLogs.map(log => ({
      ID: log.id,
      Użytkownik: log.user,
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
