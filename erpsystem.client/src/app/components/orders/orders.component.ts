import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { OrderFormComponent } from '../order-form/order-form.component';

interface OrderDto {
  id: number;
  orderNumber: string;
  contractorId: number;
  contractorName: string;
  orderType: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  createdBy: string;
  createdDate: string;
  isDeleted: boolean;
  orderItems: OrderItemDto[];
}

interface OrderItemDto {
  id: number;
  orderId: number;
  warehouseItemId: number;
  warehouseItemName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface ContractorDto {
  id: number;
  name: string;
}

interface WarehouseItemDto {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderHistoryDto {
  id: number;
  orderId: number;
  action: string;
  modifiedBy: string;
  modifiedDate: Date;
  details: string;
}

interface InvoiceDto {
  id: number;
  orderId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  contractorId: number;
  contractorName: string;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  status: string;
  filePath: string;
  createdDate: string;
  createdBy: string;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, OrderFormComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersComponent implements OnInit {
  apiUrl = 'https://localhost:7224/api/orders';
  orders: OrderDto[] = [];
  filteredOrders: OrderDto[] = [];
  contractors: ContractorDto[] = [];
  warehouseItems: WarehouseItemDto[] = [];
  orderTypes = [
    { value: 'Purchase', display: 'Zakup' },
    { value: 'Sale', display: 'Sprzedaż' }
  ];
  orderStatuses = [
    { value: 'Draft', display: 'Szkic' },
    { value: 'Confirmed', display: 'Potwierdzone' },
    { value: 'InProgress', display: 'W trakcie' },
    { value: 'Shipped', display: 'Wysłane' },
    { value: 'Completed', display: 'Zakończone' },
    { value: 'Cancelled', display: 'Anulowane' },
    { value: 'Received', display: 'Przyjęte' }
  ];
  filterForm: FormGroup;
  selectedOrder: OrderDto | null = null;
  orderToDelete: number | null = null;
  orderHistory: OrderHistoryDto[] = [];
  showAddForm = false;
  showEditForm = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  notificationMessage: string | null = null;
  isGeneratingInvoice = false;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  currentUserEmail = 'test@example.com';

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      nameFilter: [''],
      typeFilter: [''],
      statusFilter: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit() {
    this.loadContractors();
    this.loadWarehouseItems();
    this.loadOrders();
  }

  loadOrders() {
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('pageSize', this.pageSize.toString());

    const filters = this.filterForm.value;
    if (filters.nameFilter) params = params.set('contractorName', filters.nameFilter);
    if (filters.typeFilter) params = params.set('orderType', filters.typeFilter);
    if (filters.statusFilter) params = params.set('status', filters.statusFilter);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    this.http.get<{ items: OrderDto[], totalItems: number }>(`${this.apiUrl}/paged`, { params }).subscribe({
      next: (response) => {
        this.filteredOrders = response.items;
        this.totalItems = response.totalItems;
        this.cdr.markForCheck();
      },
      error: (error) => this.setError(`Błąd ładowania zamówień: ${error.message}`)
    });
  }

  loadContractors() {
    this.http.get<ContractorDto[]>('https://localhost:7224/api/contractors').subscribe({
      next: (data) => {
        this.contractors = data;
        this.cdr.markForCheck();
      },
      error: (error) => this.setError(`Błąd ładowania kontrahentów: ${error.message}`)
    });
  }

  loadWarehouseItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouseitems').subscribe({
      next: (data) => {
        this.warehouseItems = data.map(item => ({
          ...item,
          id: Number(item.id),
          unitPrice: Number(item.unitPrice)
        }));
        this.cdr.markForCheck();
      },
      error: (error) => this.setError(`Błąd ładowania produktów: ${error.message}`)
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadOrders();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadOrders();
    }
  }

  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.loadOrders();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.showEditForm = false;
    this.cdr.markForCheck();
  }

  toggleEditForm(order: OrderDto) {
    this.showEditForm = !this.showEditForm;
    this.showAddForm = false;
    this.selectedOrder = order;
    this.cdr.markForCheck();
  }

  onOrderSaved() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedOrder = null;
    this.loadOrders();
    this.setSuccess('Zamówienie zapisane.');
  }

  confirmDelete(id: number) {
    this.orderToDelete = id;
    this.cdr.markForCheck();
  }

  deleteOrder(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.setSuccess('Zamówienie usunięte.');
        this.orderToDelete = null;
        this.loadOrders();
      },
      error: (error) => this.setError(`Błąd usuwania zamówienia: ${error.message}`)
    });
  }

  cancelDelete() {
    this.orderToDelete = null;
    this.cdr.markForCheck();
  }

  confirmOrder(orderId: number) {
    this.http.post(`${this.apiUrl}/confirm/${orderId}`, {}).subscribe({
      next: () => {
        this.loadOrders();
        this.notificationMessage = 'Zamówienie zostało potwierdzone.';
        this.cdr.markForCheck();
      },
      error: (error) => this.setError(`Błąd potwierdzania zamówienia: ${error.message}`)
    });
  }

  generateInvoice(orderId: number) {
    this.isGeneratingInvoice = true;
    const token = localStorage.getItem('token');
    const payload = {
      orderId: orderId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    this.http.post<InvoiceDto>(`https://localhost:7224/api/invoices/generate/${orderId}`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (invoice) => {
        this.setSuccess(`Faktura ${invoice.invoiceNumber} została wygenerowana.`);
        this.loadOrders();
        this.isGeneratingInvoice = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.setError(`Błąd generowania faktury: ${error.message}`);
        this.isGeneratingInvoice = false;
        this.cdr.markForCheck();
      }
    });
  }

  showDetails(order: OrderDto) {
    this.selectedOrder = order;
    this.http.get<OrderHistoryDto[]>(`${this.apiUrl}/${order.id}/history`).subscribe({
      next: (data) => {
        this.orderHistory = data;
        this.cdr.markForCheck();
      },
      error: (error) => this.setError(`Błąd ładowania historii: ${error.message}`)
    });
  }

  closeDetails() {
    this.selectedOrder = null;
    this.orderHistory = [];
    this.cdr.markForCheck();
  }

  getTypeDisplay(type: string): string {
    return this.orderTypes.find(t => t.value === type)?.display || type;
  }

  getStatusDisplay(status: string): string {
    return this.orderStatuses.find(s => s.value === status)?.display || status;
  }

  exportToCsv() {
    const headers = ['Numer', 'Kontrahent', 'Typ', 'Data', 'Kwota', 'Status'];
    const rows = this.filteredOrders.map(o => [
      o.orderNumber,
      o.contractorName,
      this.getTypeDisplay(o.orderType),
      new Date(o.orderDate).toLocaleDateString(),
      o.totalAmount.toFixed(2),
      this.getStatusDisplay(o.status)
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
  }

  logout() {
    this.router.navigate(['/login']);
  }

  private setError(message: string) {
    this.errorMessage = message;
    this.successMessage = null;
    this.notificationMessage = null;
    this.cdr.markForCheck();
  }

  private setSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = null;
    this.cdr.markForCheck();
  }

  trackByOrderId(index: number, order: OrderDto): number {
    return order.id;
  }
}
