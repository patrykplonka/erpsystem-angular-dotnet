import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

interface ContractorDto {
  id: number;
  name: string;
  type: 'Supplier' | 'Client' | 'Both';
  email: string;
  phone: string;
  address: string;
  taxId: string;
  isDeleted: boolean;
}

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  category: string;
  location: string;
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  contractorId: number | null;
  contractorName: string;
  batchNumber: string;
  expirationDate: string | null;
  purchaseCost: number;
  vatRate: number;
  isDeleted: boolean;
}

interface OrderItemDto {
  warehouseItemId: number;
  warehouseItemName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface CreateOrderDto {
  orderNumber: string;
  contractorId: number;
  orderType: 'Zakup' | 'Sprzedaż';
  orderDate: string;
  status: 'Oczekujące';
  createdBy: string;
  orderItems: OrderItemDto[];
}

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SidebarComponent],
  standalone: true
})
export class OrderFormComponent implements OnInit {
  order: CreateOrderDto = {
    orderNumber: '',
    contractorId: 0,
    orderType: 'Zakup',
    orderDate: new Date().toISOString().split('T')[0],
    status: 'Oczekujące',
    createdBy: '',
    orderItems: []
  };
  contractors: ContractorDto[] = [];
  warehouseItems: WarehouseItemDto[] = [];
  newItem: OrderItemDto = { warehouseItemId: 0, warehouseItemName: '', quantity: 1, unitPrice: 0, vatRate: 0.23, totalPrice: 0 };
  errorMessage: string | null = null;
  successMessage: string | null = null;
  currentUserEmail: string | null = null;
  apiUrl = 'https://localhost:7224/api/orders';
  contractorsApiUrl = 'https://localhost:7224/api/contractors';
  warehouseApiUrl = 'https://localhost:7224/api/warehouseitems';
  generateOrderNumberUrl = 'https://localhost:7224/api/orders/generate-order-number';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.order.createdBy = this.currentUserEmail || 'System';
    this.loadContractors();
    this.loadWarehouseItems();
    this.generateOrderNumber();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  generateOrderNumber() {
    const apiOrderType = this.order.orderType === 'Zakup' ? 'Purchase' : 'Sale';
    this.http.get<{ orderNumber: string }>(`${this.generateOrderNumberUrl}?orderType=${apiOrderType}`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.order.orderNumber = data.orderNumber;
      },
      error: (error) => {
        this.errorMessage = `Błąd generowania numeru zamówienia: ${error.status} ${error.message}`;
      }
    });
  }

  loadContractors() {
    this.http.get<ContractorDto[]>(this.contractorsApiUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.contractors = data.filter(c => !c.isDeleted);
      },
      error: (error) => {
        this.errorMessage = `Błąd ładowania kontrahentów: ${error.status} ${error.message}`;
      }
    });
  }

  loadWarehouseItems() {
    this.http.get<WarehouseItemDto[]>(this.warehouseApiUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.warehouseItems = data.filter(p => !p.isDeleted && p.quantity > 0);
        if (this.warehouseItems.length === 0) {
          this.errorMessage = 'Brak dostępnych produktów w magazynie.';
        }
      },
      error: (error) => {
        this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}.`;
      }
    });
  }

  onProductSelect() {
    const itemId = Number(this.newItem.warehouseItemId);
    const selectedItem = this.warehouseItems.find(p => p.id === itemId);
    if (selectedItem) {
      this.newItem.unitPrice = selectedItem.unitPrice;
      this.newItem.vatRate = selectedItem.vatRate || 0.23;
      this.newItem.warehouseItemName = selectedItem.name;
    } else {
      this.newItem.unitPrice = 0;
      this.newItem.vatRate = 0.23;
      this.newItem.warehouseItemName = '';
    }
  }

  addItem() {
    if (!this.newItem.warehouseItemId || this.newItem.warehouseItemId === 0) {
      this.errorMessage = 'Wybierz produkt.';
      return;
    }
    const itemId = Number(this.newItem.warehouseItemId);
    const selectedItem = this.warehouseItems.find(p => p.id === itemId);
    if (!selectedItem) {
      this.errorMessage = 'Wybrany produkt nie istnieje.';
      return;
    }
    if (this.newItem.quantity <= 0 || this.newItem.quantity > selectedItem.quantity) {
      this.errorMessage = `Nieprawidłowa ilość. Dostępne: ${selectedItem.quantity}.`;
      return;
    }
    this.newItem.totalPrice = this.newItem.quantity * this.newItem.unitPrice * (1 + this.newItem.vatRate);
    this.order.orderItems.push({
      warehouseItemId: itemId,
      warehouseItemName: selectedItem.name,
      quantity: this.newItem.quantity,
      unitPrice: this.newItem.unitPrice,
      vatRate: this.newItem.vatRate,
      totalPrice: this.newItem.totalPrice
    });
    this.newItem = { warehouseItemId: 0, warehouseItemName: '', quantity: 1, unitPrice: 0, vatRate: 0.23, totalPrice: 0 };
    this.errorMessage = null;
  }

  removeItem(index: number) {
    this.order.orderItems.splice(index, 1);
  }

  getTotalOrderPrice(): number {
    return this.order.orderItems.reduce((total, item) => total + item.totalPrice, 0);
  }

  getNetOrderPrice(): number {
    return this.order.orderItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  }

  getVatOrderPrice(): number {
    return this.getTotalOrderPrice() - this.getNetOrderPrice();
  }

  submitOrder() {
    if (!this.order.orderNumber || !this.order.contractorId || !this.order.orderType) {
      this.errorMessage = 'Wszystkie pola są wymagane.';
      return;
    }
    if (this.order.orderItems.length === 0) {
      this.errorMessage = 'Dodaj przynajmniej jeden produkt.';
      return;
    }
    const orderPayload = {
      ...this.order,
      orderType: this.order.orderType === 'Zakup' ? 'Purchase' : 'Sale',
      status: 'Pending'
    };
    this.http.post(this.apiUrl, orderPayload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.successMessage = 'Zamówienie zapisane.';
        this.errorMessage = null;
        this.router.navigate(['/orders']);
      },
      error: (error) => {
        this.errorMessage = `Błąd zapisywania zamówienia: ${error.status} ${error.message}`;
      }
    });
  }

  cancel() {
    this.router.navigate(['/orders']);
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
