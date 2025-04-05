import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  showDeleted: boolean = false;
  showAddForm: boolean = false;
  nameFilter: string = '';
  quantityFilter: number | null = null;
  priceFilter: number | null = null;
  categoryFilter: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadItems();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
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
      error => console.error('Error loading deleted items', error.status, error.message, error)
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
        error => console.error('Error updating item', error.status, error.message, error)
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
}
