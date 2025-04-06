import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
}

interface CreateWarehouseItemDto {
  name: string;
  code: string;
  quantity: number | null;
  price: number | null;
  category: string;
}

interface UpdateWarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
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
    category: ''
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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private movementService: WarehouseMovementsService
  ) { }

  ngOnInit() {
    this.loadItems();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
    this.newMovement.createdBy = this.currentUserFullName;
    console.log('ngOnInit - currentUserEmail:', this.currentUserEmail);
    console.log('ngOnInit - currentUserFullName:', this.currentUserFullName);
    console.log('ngOnInit - newMovement:', this.newMovement);
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

      return matchesNameOrCode && matchesQuantity && matchesPrice && matchesCategory;
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
      price: this.newItem.price ?? 0
    };
    this.http.post<WarehouseItemDto>('https://localhost:7224/api/warehouse', itemToSend).subscribe(
      () => {
        this.loadItems();
        this.newItem = { name: '', code: '', quantity: null, price: null, category: '' };
        this.showAddForm = false;
      },
      error => console.error('Error adding item', error.status, error.message)
    );
  }

  deleteItem(id: number) {
    this.http.delete(`https://localhost:7224/api/warehouse/${id}`).subscribe(
      () => {
        this.loadItems();
        if (this.showDeleted) this.loadDeletedItems();
      },
      error => console.error('Error deleting item', error.status, error.message)
    );
  }

  restoreItem(id: number) {
    this.http.post(`https://localhost:7224/api/warehouse/restore/${id}`, {}).subscribe(
      () => {
        this.loadItems();
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
          this.editItem = null;
        },
        error => console.error('Error updating item', error.status, error.message)
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
    }
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
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
}
