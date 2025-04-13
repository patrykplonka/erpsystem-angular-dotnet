import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

// Define interfaces directly in this file
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
  vatRate: number; // This will be in percentage form (e.g., 23) in the frontend
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

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  imports: [CommonModule, FormsModule, SidebarComponent],
  standalone: true
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
    { value: 'Cancelled', display: 'Anulowane' }
  ];
  newOrder: OrderDto = this.createEmptyOrder();
  editOrder: OrderDto | null = null;
  selectedOrder: OrderDto | null = null;
  orderToDelete: number | null = null;
  orderHistory: OrderHistoryDto[] = [];
  showAddForm = false;
  showDeleted = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  notificationMessage: string | null = null;
  isLoadingWarehouseItems = false;
  nameFilter = '';
  typeFilter = '';
  statusFilter = '';
  startDate: string | null = null;
  endDate: string | null = null;
  reportData: any[] = [];
  sortColumn: keyof OrderDto = 'orderNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  currentUserEmail = 'test@example.com';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.loadContractors();
    this.loadWarehouseItems();
    this.loadOrders();
  }

  private createEmptyOrder(): OrderDto {
    return {
      id: 0,
      orderNumber: '',
      contractorId: 0,
      contractorName: '',
      orderType: 'Purchase',
      orderDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      status: 'Draft',
      createdBy: 'System',
      createdDate: new Date().toISOString().split('T')[0], // Use yyyy-MM-dd format
      isDeleted: false,
      orderItems: []
    };
  }

  loadOrders() {
    this.http.get<OrderDto[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.orders = data;
        this.applyFilters();
      },
      error: (error) => this.setError(`Błąd ładowania zamówień: ${error.message}`)
    });
  }

  loadContractors() {
    this.http.get<ContractorDto[]>('https://localhost:7224/api/contractors').subscribe({
      next: (data) => this.contractors = data,
      error: (error) => this.setError(`Błąd ładowania kontrahentów: ${error.message}`)
    });
  }

  loadWarehouseItems() {
    this.isLoadingWarehouseItems = true;
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouseitems').subscribe({
      next: (data) => {
        console.log('Raw API response:', data);
        this.warehouseItems = data.map(item => ({
          ...item,
          id: Number(item.id),
          unitPrice: Number(item.unitPrice)
        }));
        console.log('Mapped warehouse items:', this.warehouseItems);
        this.isLoadingWarehouseItems = false;
      },
      error: (error) => {
        this.setError(`Błąd ładowania produktów: ${error.message}`);
        this.isLoadingWarehouseItems = false;
      }
    });
  }

  applyFilters() {
    let filtered = this.showDeleted ? this.orders.filter(o => o.isDeleted) : this.orders.filter(o => !o.isDeleted);
    filtered = filtered.filter(o => {
      const matchesName = !this.nameFilter || o.contractorName.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesType = !this.typeFilter || o.orderType === this.typeFilter;
      const matchesStatus = !this.statusFilter || o.status === this.statusFilter;
      const matchesStartDate = !this.startDate || new Date(o.orderDate) >= new Date(this.startDate);
      const matchesEndDate = !this.endDate || new Date(o.orderDate) <= new Date(this.endDate);
      return matchesName && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    });

    filtered.sort((a, b) => {
      const valueA = a[this.sortColumn];
      const valueB = b[this.sortColumn];
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      return this.sortDirection === 'asc' ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
    });

    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredOrders = filtered.slice(start, start + this.pageSize);
  }

  sortTable(column: keyof OrderDto) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
    }
  }

  toggleAddForm() {
    if (this.warehouseItems.length === 0) {
      this.setError('Najpierw załaduj produkty z magazynu.');
      return;
    }
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.newOrder = this.createEmptyOrder();
      this.http.get<{ orderNumber: string }>(`${this.apiUrl}/generate-order-number?orderType=${this.newOrder.orderType}`).subscribe({
        next: (data) => this.newOrder.orderNumber = data.orderNumber,
        error: (error) => this.setError(`Błąd generowania numeru: ${error.message}`)
      });
      this.addOrderItem(this.newOrder.orderItems);
    }
  }

  addOrderItem(items: OrderItemDto[]) {
    items.push({
      id: 0,
      orderId: 0,
      warehouseItemId: 0,
      warehouseItemName: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 23, // Percentage form (will be converted to decimal when sending to backend)
      totalPrice: 0
    });
  }

  removeOrderItem(items: OrderItemDto[], index: number) {
    items.splice(index, 1);
    this.updateTotalAmount(items);
  }

  updateOrderItem(item: OrderItemDto) {
    const warehouseItemId = Number(item.warehouseItemId);
    const selectedItem = this.warehouseItems.find(wi => wi.id === warehouseItemId);
    if (selectedItem) {
      item.warehouseItemId = warehouseItemId;
      item.warehouseItemName = selectedItem.name;
      item.unitPrice = Number(selectedItem.unitPrice);
      if (item.unitPrice <= 0) {
        this.setError(`Produkt ${selectedItem.name} ma cenę 0. Zaktualizuj cenę w bazie danych.`);
        item.totalPrice = 0;
        return;
      }
      // Calculate totalPrice using vatRate as a percentage
      item.totalPrice = Number((item.quantity * item.unitPrice * (1 + item.vatRate / 100)).toFixed(2));
    } else {
      item.warehouseItemId = 0;
      item.warehouseItemName = '';
      item.unitPrice = 0;
      item.totalPrice = 0;
    }
    this.updateTotalAmount(this.newOrder.orderItems);
    if (this.editOrder) {
      this.updateTotalAmount(this.editOrder.orderItems);
    }
  }

  updateTotalAmount(items: OrderItemDto[]) {
    const total = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
    if (this.editOrder) {
      this.editOrder.totalAmount = total;
    } else {
      this.newOrder.totalAmount = total;
    }
  }

  onOrderTypeChange() {
    this.http.get<{ orderNumber: string }>(`${this.apiUrl}/generate-order-number?orderType=${this.newOrder.orderType}`).subscribe({
      next: (data) => this.newOrder.orderNumber = data.orderNumber,
      error: (error) => this.setError(`Błąd generowania numeru: ${error.message}`)
    });
  }

  addOrder() {
    if (this.newOrder.contractorId === 0) {
      this.setError('Wybierz kontrahenta.');
      return;
    }
    if (this.newOrder.orderItems.length === 0 || this.newOrder.orderItems.some((item: OrderItemDto) => item.warehouseItemId === 0)) {
      this.setError('Dodaj co najmniej jeden produkt i wybierz produkt dla każdego elementu.');
      return;
    }
    if (!this.newOrder.orderDate || !this.newOrder.orderType) {
      this.setError('Data i typ zamówienia są wymagane.');
      return;
    }
    if (this.newOrder.orderItems.some((item: OrderItemDto) => item.unitPrice <= 0)) {
      this.setError('Wszystkie produkty muszą mieć cenę jednostkową większą od 0. Zaktualizuj ceny w bazie danych.');
      return;
    }

    const contractor = this.contractors.find(c => c.id === Number(this.newOrder.contractorId));
    if (!contractor) {
      this.setError('Wybrany kontrahent nie istnieje.');
      return;
    }
    this.newOrder.contractorName = contractor.name;
    this.newOrder.contractorId = Number(this.newOrder.contractorId);
    this.newOrder.orderItems.forEach((item: OrderItemDto) => {
      item.warehouseItemId = Number(item.warehouseItemId);
      const warehouseItem = this.warehouseItems.find(wi => wi.id === item.warehouseItemId);
      if (warehouseItem) {
        item.warehouseItemName = warehouseItem.name;
        item.unitPrice = Number(warehouseItem.unitPrice);
        item.totalPrice = Number((item.quantity * item.unitPrice * (1 + item.vatRate / 100)).toFixed(2));
        item.orderId = 0;
      }
    });
    this.updateTotalAmount(this.newOrder.orderItems);

    this.newOrder.orderDate = new Date(this.newOrder.orderDate).toISOString().split('T')[0];
    this.newOrder.createdDate = new Date().toISOString().split('T')[0]; // Use yyyy-MM-dd format

    const payload = {
      id: this.newOrder.id,
      orderNumber: this.newOrder.orderNumber,
      contractorId: this.newOrder.contractorId,
      contractorName: this.newOrder.contractorName,
      orderType: this.newOrder.orderType,
      orderDate: this.newOrder.orderDate,
      totalAmount: Number(this.newOrder.totalAmount.toFixed(2)),
      status: this.newOrder.status,
      createdBy: this.newOrder.createdBy,
      createdDate: this.newOrder.createdDate,
      isDeleted: this.newOrder.isDeleted,
      orderItems: this.newOrder.orderItems.map((item: OrderItemDto) => ({
        id: item.id,
        orderId: item.orderId,
        warehouseItemId: Number(item.warehouseItemId),
        warehouseItemName: item.warehouseItemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice.toFixed(2)),
        vatRate: Number((item.vatRate / 100).toFixed(2)), // Convert percentage to decimal (e.g., 23 -> 0.23)
        totalPrice: Number(item.totalPrice.toFixed(2))
      }))
    };

    // Log the payload for debugging
    console.log('Payload being sent:', payload);

    this.http.post<OrderDto>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.setSuccess('Zamówienie dodane.');
        this.showAddForm = false;
        this.loadOrders();
        this.newOrder = this.createEmptyOrder();
      },
      error: (error) => {
        let errorMsg = 'Błąd dodawania zamówienia';
        if (error.error) {
          // Log the full error response to see ModelState errors
          console.error('Backend error response:', error.error);
          if (error.error.errors) {
            // Extract ModelState validation errors
            const validationErrors = Object.keys(error.error.errors)
              .map(key => `${key}: ${error.error.errors[key].join(', ')}`)
              .join('; ');
            errorMsg += `: ${validationErrors}`;
          } else if (error.error.message) {
            errorMsg += `: ${error.error.message}`;
          }
        } else if (error.message) {
          errorMsg += `: ${error.message}`;
        }
        this.setError(errorMsg);
      }
    });
  }

  startEdit(order: OrderDto) {
    this.editOrder = { ...order, orderDate: new Date(order.orderDate).toISOString().split('T')[0] };
  }

  updateOrder() {
    if (!this.editOrder) {
      this.setError('Brak zamówienia do edycji.');
      return;
    }
    const editOrder = this.editOrder;
    if (editOrder.contractorId === 0 || editOrder.orderItems.some((item: OrderItemDto) => item.warehouseItemId === 0)) {
      this.setError('Wypełnij wszystkie wymagane pola.');
      return;
    }
    if (editOrder.orderItems.some((item: OrderItemDto) => item.unitPrice <= 0)) {
      this.setError('Wszystkie produkty muszą mieć cenę jednostkową większą od 0. Zaktualizuj ceny w bazie danych.');
      return;
    }
    const contractor = this.contractors.find(c => c.id === editOrder.contractorId);
    editOrder.contractorName = contractor ? contractor.name : '';
    editOrder.orderItems.forEach((item: OrderItemDto) => {
      item.warehouseItemId = Number(item.warehouseItemId);
      const warehouseItem = this.warehouseItems.find(wi => wi.id === item.warehouseItemId);
      if (warehouseItem) {
        item.warehouseItemName = warehouseItem.name;
        item.unitPrice = Number(warehouseItem.unitPrice);
        item.totalPrice = Number((item.quantity * item.unitPrice * (1 + item.vatRate / 100)).toFixed(2));
      }
    });
    this.updateTotalAmount(editOrder.orderItems);
    const payload = {
      ...editOrder,
      totalAmount: Number(editOrder.totalAmount.toFixed(2)),
      orderItems: editOrder.orderItems.map((item: OrderItemDto) => ({
        id: item.id,
        orderId: item.orderId,
        warehouseItemId: Number(item.warehouseItemId),
        warehouseItemName: item.warehouseItemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice.toFixed(2)),
        vatRate: Number((item.vatRate / 100).toFixed(2)), // Convert percentage to decimal
        totalPrice: Number(item.totalPrice.toFixed(2))
      }))
    };
    this.http.put(`${this.apiUrl}/${editOrder.id}`, payload).subscribe({
      next: () => {
        this.setSuccess('Zamówienie zaktualizowane.');
        this.editOrder = null;
        this.loadOrders();
      },
      error: (error) => {
        let errorMsg = 'Błąd aktualizacji zamówienia';
        if (error.error && error.error.message) {
          errorMsg += ': ' + error.error.message;
        } else if (error.message) {
          errorMsg += ': ' + error.message;
        }
        this.setError(errorMsg);
      }
    });
  }

  cancelEdit() {
    this.editOrder = null;
  }

  confirmDelete(id: number) {
    this.orderToDelete = id;
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
  }

  restoreOrder(id: number) {
    const order = this.orders.find(o => o.id === id);
    if (order) {
      this.http.put(`${this.apiUrl}/${id}`, { ...order, isDeleted: false }).subscribe({
        next: () => {
          this.setSuccess('Zamówienie przywrócone.');
          this.loadOrders();
        },
        error: (error) => this.setError(`Błąd przywracania zamówienia: ${error.message}`)
      });
    }
  }

  confirmOrder(id: number) {
    this.http.post(`${this.apiUrl}/${id}/confirm`, {}).subscribe({
      next: () => {
        this.setSuccess('Zamówienie potwierdzone.');
        this.notificationMessage = 'Zamówienie zostało potwierdzone i powiadomienie wysłane.';
        this.loadOrders();
      },
      error: (error) => this.setError(`Błąd potwierdzania zamówienia: ${error.message}`)
    });
  }

  updateStatus(order: OrderDto) {
    this.http.post(`${this.apiUrl}/${order.id}/update-status`, { status: order.status }).subscribe({
      next: () => {
        this.setSuccess(`Status zmieniony na ${this.getStatusDisplay(order.status)}.`);
        this.loadOrders();
      },
      error: (error) => this.setError(`Błąd zmiany statusu: ${error.message}`)
    });
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    this.currentPage = 1;
    this.applyFilters();
  }

  showDetails(order: OrderDto) {
    this.selectedOrder = order;
    this.http.get<OrderHistoryDto[]>(`${this.apiUrl}/${order.id}/history`).subscribe({
      next: (data) => this.orderHistory = data,
      error: (error) => this.setError(`Błąd ładowania historii: ${error.message}`)
    });
  }

  closeDetails() {
    this.selectedOrder = null;
    this.orderHistory = [];
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

  importFromCsv(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const lines = text.split('\n').map(line => line.split(','));
        const headers = lines[0];
        const orders = lines.slice(1).map(row => {
          const order: any = {};
          headers.forEach((header, index) => {
            order[header.trim()] = row[index]?.trim();
          });
          return order;
        }).filter(o => o.Numer);

        orders.forEach((o: any) => {
          const orderDto: OrderDto = {
            id: 0,
            orderNumber: o.Numer,
            contractorId: this.contractors.find(c => c.name === o.Kontrahent)?.id || 0,
            contractorName: o.Kontrahent,
            orderType: this.orderTypes.find(t => t.display === o.Typ)?.value || 'Purchase',
            orderDate: new Date(o.Data).toISOString().split('T')[0],
            totalAmount: parseFloat(o.Kwota) || 0,
            status: this.orderStatuses.find(s => s.display === o.Status)?.value || 'Draft',
            createdBy: 'System',
            createdDate: new Date().toISOString().split('T')[0],
            isDeleted: false,
            orderItems: []
          };
          this.http.post(this.apiUrl, orderDto).subscribe({
            next: () => this.loadOrders(),
            error: (error) => this.setError(`Błąd importu: ${error.message}`)
          });
        });
        this.setSuccess('Zamówienia zaimportowane.');
      };
      reader.readAsText(file);
    }
  }

  generateReport() {
    const params = new URLSearchParams();
    if (this.startDate) params.append('startDate', this.startDate);
    if (this.endDate) params.append('endDate', this.endDate);
    this.http.get<any[]>(`${this.apiUrl}/report?${params.toString()}`).subscribe({
      next: (data) => this.reportData = data,
      error: (error) => this.setError(`Błąd generowania raportu: ${error.message}`)
    });
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
  }

  private setSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = null;
  }
}
