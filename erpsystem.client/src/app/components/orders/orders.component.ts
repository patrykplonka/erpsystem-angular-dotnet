import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

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
}

interface PagedResult<T> {
  items: T[];
  totalItems: number;
}

@Component({
  selector: 'app-order',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, SidebarComponent],
  standalone: true
})
export class OrdersComponent implements OnInit {
  orders: OrderDto[] = [];
  deletedOrders: OrderDto[] = [];
  filteredOrders: OrderDto[] = [];
  apiUrl = 'https://localhost:7224/api/orders/paged';
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  filterStatus = '';
  filterType = '';
  sortField: keyof OrderDto = 'orderNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 10;
  private _totalItems = 0;
  totalPages = 1;
  currentUserEmail: string | null = null;
  showDeleted = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  get totalItems(): number {
    return this._totalItems;
  }

  set totalItems(value: number) {
    this._totalItems = value;
    this.totalPages = Math.ceil(value / this.pageSize) || 1;
  }

  ngOnInit() {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.errorMessage = null;

    let params = new HttpParams()
      .set('page', this.page.toString())
      .set('pageSize', this.pageSize.toString());

    if (this.filterStatus) params = params.set('status', this.filterStatus);
    if (this.filterType) params = params.set('orderType', this.filterType);

    this.http.get<PagedResult<OrderDto>>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this.orders = data.items.filter(order => !order.isDeleted);
        this.deletedOrders = data.items.filter(order => order.isDeleted);
        this.totalItems = data.totalItems;
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        const serverMessage = error.status === 405
          ? 'Metoda GET nie jest dozwolona. Sprawdź konfigurację API.'
          : (error.error?.message || error.message);
        this.errorMessage = `Błąd ładowania zamówień: ${serverMessage} (Status: ${error.status})`;
        this.isLoading = false;
      }
    });
  }

  applyFiltersAndSort() {
    let result = this.showDeleted ? [...this.deletedOrders] : [...this.orders];

    if (this.filterStatus) {
      result = result.filter(order => order.status.toLowerCase() === this.filterStatus.toLowerCase());
    }
    if (this.filterType) {
      result = result.filter(order => order.orderType.toLowerCase() === this.filterType.toLowerCase());
    }

    result.sort((a, b) => {
      const valueA = a[this.sortField];
      const valueB = b[this.sortField];
      const direction = this.sortDirection === 'asc' ? 1 : -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB) * direction;
      }
      return ((valueA < valueB ? -1 : 1) * direction);
    });

    this.filteredOrders = result;
  }

  sortBy(field: keyof OrderDto) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }

  deleteOrder(id: number) {
    if (!confirm('Czy na pewno chcesz usunąć to zamówienie?')) {
      return;
    }

    this.isLoading = true;
    this.http.delete(`https://localhost:7224/api/orders/${id}`).subscribe({
      next: () => {
        this.orders = this.orders.filter(order => order.id !== id);
        this.applyFiltersAndSort();
        this.successMessage = 'Zamówienie usunięte.';
        this.errorMessage = null;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Błąd usuwania zamówienia: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  restoreOrder(id: number) {
    this.isLoading = true;
    this.http.post(`https://localhost:7224/api/orders/restore/${id}`, {}).subscribe({
      next: () => {
        this.successMessage = 'Zamówienie przywrócone.';
        this.errorMessage = null;
        this.loadOrders();
      },
      error: (error) => {
        this.errorMessage = `Błąd przywracania zamówienia: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    this.page = 1;
    this.applyFiltersAndSort();
  }

  resetFilters() {
    this.filterStatus = '';
    this.filterType = '';
    this.sortField = 'orderNumber';
    this.sortDirection = 'asc';
    this.page = 1;
    this.loadOrders();
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadOrders();
    }
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
