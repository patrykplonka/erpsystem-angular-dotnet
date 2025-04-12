import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  orders: OrderDto[] = [];
  contractors: ContractorDto[] = [];
  warehouseItems: WarehouseItemDto[] = [];
  newOrder: CreateOrderDto = {
    orderNumber: '',
    contractorId: 0,
    orderType: 'Purchase',
    orderDate: new Date(),
    status: 'Draft',
    orderItems: []
  };
  editOrder: UpdateOrderDto | null = null;
  selectedOrder: OrderDto | null = null;
  orderToDelete: number | null = null;
  currentUserEmail: string | null = null;
  showAddForm: boolean = false;
  showDeleted: boolean = false;
  nameFilter: string = '';
  typeFilter: string = '';
  statusFilter: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  orderTypes = [
    { display: 'Zakup', value: 'Purchase' },
    { display: 'Sprzedaż', value: 'Sale' }
  ];
  orderStatuses = [
    { display: 'Szkic', value: 'Draft' },
    { display: 'Potwierdzone', value: 'Confirmed' },
    { display: 'Zrealizowane', value: 'Completed' },
    { display: 'Anulowane', value: 'Cancelled' }
  ];
  sortColumn: keyof OrderDto | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 10;
  currentPage = 1;

  private apiUrl = 'https://localhost:7224/api/orders';
  private contractorsApiUrl = 'https://localhost:7224/api/contractors';
  private warehouseItemsApiUrl = 'https://localhost:7224/api/warehouseitems';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadOrders();
    this.loadContractors();
    this.loadWarehouseItems();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
  }

  loadOrders() {
    this.http.get<OrderDto[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.orders = data;
      },
      error: (error) => this.errorMessage = `Błąd ładowania zamówień: ${error.status} ${error.message}`
    });
  }

  loadContractors() {
    this.http.get<ContractorDto[]>(this.contractorsApiUrl).subscribe({
      next: (data) => {
        this.contractors = data.filter(c => !c.isDeleted);
      },
      error: (error) => this.errorMessage = `Błąd ładowania kontrahentów: ${error.status} ${error.message}`
    });
  }

  loadWarehouseItems() {
    this.http.get<WarehouseItemDto[]>(this.warehouseItemsApiUrl).subscribe({
      next: (data) => {
        this.warehouseItems = data.filter(wi => !wi.isDeleted);
      },
      error: (error) => this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}`
    });
  }

  getTypeDisplay(type: string): string {
    const typeObj = this.orderTypes.find(t => t.value === type);
    return typeObj ? typeObj.display : type;
  }

  getStatusDisplay(status: string): string {
    const statusObj = this.orderStatuses.find(s => s.value === status);
    return statusObj ? statusObj.display : status;
  }

  applyFilters() {
    let filtered = this.showDeleted ? this.orders.filter(o => o.isDeleted) : this.orders.filter(o => !o.isDeleted);
    filtered = filtered.filter(o => {
      const matchesName = !this.nameFilter || o.contractorName.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesType = !this.typeFilter || o.orderType === this.typeFilter;
      const matchesStatus = !this.statusFilter || o.status === this.statusFilter;
      return matchesName && matchesType && matchesStatus;
    });
    if (this.sortColumn) {
      filtered.sort((a, b) => {
        const valueA = a[this.sortColumn!];
        const valueB = b[this.sortColumn!];
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.sortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        return this.sortDirection === 'asc'
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      });
    }
    return filtered;
  }

  get filteredOrders(): OrderDto[] {
    const filtered = this.applyFilters();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.applyFilters().length / this.pageSize);
  }

  sortTable(column: keyof OrderDto) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  addOrder() {
    if (!this.newOrder.orderNumber || !this.newOrder.contractorId || !this.newOrder.orderType || !this.newOrder.orderItems.length) {
      this.errorMessage = 'Wszystkie pola i co najmniej jeden produkt są wymagane.';
      return;
    }
    this.newOrder.createdBy = this.currentUserEmail || 'System';
    this.http.post<OrderDto>(this.apiUrl, this.newOrder).subscribe({
      next: (response) => {
        this.successMessage = `Dodano zamówienie: ${response.orderNumber}`;
        this.errorMessage = null;
        this.loadOrders();
        this.toggleAddForm();
      },
      error: (error) => this.errorMessage = `Błąd dodawania zamówienia: ${error.status} ${error.message}`
    });
  }

  startEdit(order: OrderDto) {
    this.editOrder = {
      ...order,
      orderDate: new Date(order.orderDate)
    };
  }

  updateOrder() {
    if (!this.editOrder || !this.editOrder.orderNumber || !this.editOrder.contractorId || !this.editOrder.orderType || !this.editOrder.orderItems.length) {
      this.errorMessage = 'Wszystkie pola i co najmniej jeden produkt są wymagane.';
      return;
    }
    this.http.put(`${this.apiUrl}/${this.editOrder.id}`, this.editOrder).subscribe({
      next: () => {
        this.successMessage = `Zaktualizowano zamówienie: ${this.editOrder!.orderNumber}`;
        this.errorMessage = null;
        this.loadOrders();
        this.editOrder = null;
      },
      error: (error) => this.errorMessage = `Błąd aktualizacji zamówienia: ${error.status} ${error.message}`
    });
  }

  confirmDelete(id: number) {
    this.orderToDelete = id;
  }

  cancelDelete() {
    this.orderToDelete = null;
  }

  deleteOrder(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.successMessage = 'Zamówienie usunięte.';
        this.errorMessage = null;
        this.loadOrders();
        this.orderToDelete = null;
      },
      error: (error) => this.errorMessage = `Błąd usuwania zamówienia: ${error.status} ${error.message}`
    });
  }

  confirmOrder(id: number) {
    this.http.post(`${this.apiUrl}/${id}/confirm`, {}).subscribe({
      next: () => {
        this.successMessage = 'Zamówienie potwierdzone.';
        this.errorMessage = null;
        this.loadOrders();
      },
      error: (error) => this.errorMessage = `Błąd potwierdzania zamówienia: ${error.status} ${error.message}`
    });
  }

  restoreOrder(id: number) {
    this.http.post(`${this.apiUrl}/restore/${id}`, {}).subscribe({
      next: () => {
        this.successMessage = 'Zamówienie przywrócone.';
        this.errorMessage = null;
        this.loadOrders();
      },
      error: (error) => this.errorMessage = `Błąd przywracania zamówienia: ${error.status} ${error.message}`
    });
  }

  addOrderItem(orderItems: OrderItemDto[]) {
    orderItems.push({
      warehouseItemId: 0,
      quantity: 1,
      unitPrice: 0,
      vatRate: 0.23,
      totalPrice: 0
    });
  }

  removeOrderItem(orderItems: OrderItemDto[], index: number) {
    orderItems.splice(index, 1);
  }

  updateOrderItem(orderItem: OrderItemDto) {
    const item = this.warehouseItems.find(wi => wi.id === orderItem.warehouseItemId);
    if (item) {
      orderItem.unitPrice = item.price;
      orderItem.totalPrice = orderItem.quantity * orderItem.unitPrice * (1 + orderItem.vatRate);
    }
  }

  exportToCsv() {
    const headers = ['ID,Numer,Kontrahent,Typ,Data,Kwota,Status,Usunięty\n'];
    const rows = this.applyFilters().map(o =>
      `${o.id},${o.orderNumber},${o.contractorName},${o.orderType},${o.orderDate.toISOString().split('T')[0]},${o.totalAmount},${o.status},${o.isDeleted ? 'Tak' : 'Nie'}`
    );
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zamowienia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  importFromCsv(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const orders: CreateOrderDto[] = [];

      for (let i = 1; i < lines.length; i++) {
        const [orderNumber, contractorId, orderType, orderDate] = lines[i].split(',').map(val => val.trim());
        if (orderNumber && contractorId && orderType && orderDate) {
          orders.push({
            orderNumber,
            contractorId: parseInt(contractorId),
            orderType: orderType as 'Purchase' | 'Sale',
            orderDate: new Date(orderDate),
            status: 'Draft',
            orderItems: []
          });
        }
      }

      if (orders.length === 0) {
        this.errorMessage = 'Brak poprawnych danych w pliku CSV.';
        return;
      }

      this.http.post(`${this.apiUrl}/import`, orders).subscribe({
        next: (response: any) => {
          this.successMessage = response.message || 'Import zakończony sukcesem.';
          this.errorMessage = null;
          this.loadOrders();
          input.value = '';
        },
        error: (error) => {
          this.errorMessage = error.error.message || 'Błąd importu zamówień.';
          if (error.error.errors) {
            this.errorMessage += ' ' + error.error.errors.join(' ');
          }
        }
      });
    };
    reader.readAsText(file);
  }

  showDetails(order: OrderDto) {
    this.selectedOrder = order;
  }

  closeDetails() {
    this.selectedOrder = null;
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    this.currentPage = 1;
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.errorMessage = null;
    this.successMessage = null;
    if (!this.showAddForm) {
      this.newOrder = {
        orderNumber: '',
        contractorId: 0,
        orderType: 'Purchase',
        orderDate: new Date(),
        status: 'Draft',
        orderItems: []
      };
    }
  }

  cancelEdit() {
    this.editOrder = null;
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

interface OrderDto {
  id: number;
  orderNumber: string;
  contractorId: number;
  contractorName: string;
  orderType: 'Purchase' | 'Sale';
  orderDate: Date;
  totalAmount: number;
  status: 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdBy: string;
  createdDate: Date;
  isDeleted: boolean;
  orderItems: OrderItemDto[];
}

interface CreateOrderDto {
  orderNumber: string;
  contractorId: number;
  orderType: 'Purchase' | 'Sale';
  orderDate: Date;
  status: 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdBy?: string;
  orderItems: OrderItemDto[];
}

interface UpdateOrderDto {
  id: number;
  orderNumber: string;
  contractorId: number;
  orderType: 'Purchase' | 'Sale';
  orderDate: Date;
  status: 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
  orderItems: OrderItemDto[];
}

interface OrderItemDto {
  id?: number;
  orderId?: number;
  warehouseItemId: number;
  warehouseItemName?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface ContractorDto {
  id: number;
  name: string;
  type: string;
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
  price: number;
  category: string;
  location: string;
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  contractorId?: number;
  contractorName: string;
  batchNumber: string;
  expirationDate?: Date;
  purchaseCost: number;
  vatRate: number;
  isDeleted: boolean;
}
