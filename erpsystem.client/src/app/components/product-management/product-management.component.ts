import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit {
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
  availableLocations: Location[] = [];
  lowStockThreshold: number = 5;
  notifications: string[] = [];
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  lowStockFilter: boolean = false;
  maxQuantity: number = 0;
  uniqueCategories: string[] = [];
  isWarehouseOpen: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadItems();
    this.loadLocations();
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

  loadLocations() {
    this.http.get<Location[]>('https://localhost:7224/api/locations').subscribe(
      data => this.availableLocations = data,
      error => this.errorMessage = `Błąd ładowania lokalizacji: ${error.status} ${error.message}`
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
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
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

  addItem() {
    if (!this.newItem.name || !this.newItem.code || this.newItem.quantity === null || this.newItem.price === null || !this.newItem.category || !this.newItem.location) {
      this.errorMessage = 'Wszystkie pola produktu są wymagane.';
      return;
    }
    if (this.newItem.quantity < 0 || this.newItem.price < 0) {
      this.errorMessage = 'Ilość i cena nie mogą być ujemne.';
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
        this.loadItems();
        this.toggleAddForm();
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
        if (this.showDeleted) this.loadDeletedItems();
      },
      error => this.errorMessage = `Błąd usuwania produktu: ${error.status} ${error.message}`
    );
  }

  restoreItem(id: number) {
    this.http.post(`https://localhost:7224/api/warehouse/restore/${id}`, { createdBy: this.currentUserFullName }).subscribe(
      () => {
        this.loadItems();
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
    }
  }

  toggleWarehouseMenu() {
    this.isWarehouseOpen = !this.isWarehouseOpen;
  }

  goToProducts() {
    this.router.navigate(['/products']);
  }

  goToMovements() {
    this.router.navigate(['/movements']);
  }

  goToReports() {
    this.router.navigate(['/reports']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
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
}

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
