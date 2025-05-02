import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

export enum WarehouseMovementType {
  PZ = 'PZ',
  PW = 'PW',
  WZ = 'WZ',
  RW = 'RW',
  MM = 'MM',
  ZW = 'ZW',
  ZK = 'ZK',
  INW = 'INW'
}

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

@Component({
  selector: 'app-warehouse-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './warehouse-movements.component.html',
  styleUrls: ['./warehouse-movements.component.css']
})
export class WarehouseMovementsComponent implements OnInit {
  movements: WarehouseMovement[] = [];
  products: Product[] = [];
  ordersToReceive: OrderDto[] = [];
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  movementSortField: string = '';
  movementSortDirection: 'asc' | 'desc' = 'asc';
  movementTypeFilter: string = '';
  movementStatusFilter: string = '';
  movementMinQuantityFilter: number | null = null;
  movementMaxQuantityFilter: number | null = null;
  movementStartDateFilter: string = '';
  movementEndDateFilter: string = '';
  movementUserFilter: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private movementService: WarehouseMovementsService
  ) { }

  ngOnInit() {
    this.loadMovements();
    this.loadProducts();
    this.loadOrdersToReceive();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
  }

  loadOrdersToReceive() {
    this.http.get<OrderDto[]>('https://localhost:7224/api/orders').subscribe({
      next: (data) => {
        this.ordersToReceive = data.filter(order =>
          order.orderType === 'Zakup' && order.status === 'Potwierdzone' && !order.isDeleted
        );
      },
      error: (error) => {
        this.errorMessage = error.status === 405
          ? 'Błąd: Serwer nie obsługuje żądania GET dla zamówień. Skontaktuj się z administratorem.'
          : `Błąd ładowania zamówień do przyjęcia: ${error.message}`;
      }
    });
  }

  receiveOrder(order: OrderDto) {
    const movements = order.orderItems.map(item => ({
      warehouseItemId: item.warehouseItemId,
      movementType: 'PZ',
      quantity: item.quantity,
      supplier: order.contractorName || '',
      documentNumber: `PZ/${order.orderNumber}`,
      description: `Przyjęcie zamówienia ${order.orderNumber}`,
      createdBy: this.currentUserFullName || 'Unknown',
      date: this.formatDateForApi(new Date()),
      status: 'Completed',
      comment: '',
      orderId: order.id
    }));

    const movementObservables = movements.map(movement =>
      this.movementService.createMovement(movement)
    );

    Promise.all(movementObservables.map(obs => obs.toPromise())).then(() => {
      this.http.post(`https://localhost:7224/api/orders/${order.id}/receive`, {}).subscribe({
        next: () => {
          this.successMessage = `Zamówienie ${order.orderNumber} zostało przyjęte.`;
          this.loadOrdersToReceive();
          this.loadMovements();
        },
        error: (error) => {
          this.errorMessage = `Błąd podczas aktualizacji statusu zamówienia: ${error.status} ${error.statusText}`;
        }
      });
    }).catch(error => {
      this.errorMessage = `Błąd podczas tworzenia ruchów magazynowych: ${error.message}`;
    });
  }

  loadProducts() {
    const url = 'https://localhost:7224/api/Warehouse';
    this.http.get<Product[]>(url).subscribe({
      next: (data: Product[]) => {
        this.products = data;
        if (this.products.length === 0) {
          this.errorMessage = 'Brak produktów w bazie danych.';
        }
      },
      error: (error: any) => {
        this.errorMessage = `Błąd ładowania produktów: ${error.status} - ${error.statusText || 'Nieznany błąd'}`;
      }
    });
  }

  navigateToAddMovement() {
    this.router.navigate(['/add-warehouse-movement']);
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

  applyFilters() {
  }

  get filteredMovements(): WarehouseMovement[] {
    let filtered = this.movements.filter(m => {
      const matchesType = !this.movementTypeFilter ||
        m.movementType.toLowerCase().includes(this.movementTypeFilter.toLowerCase());
      const matchesStatus = !this.movementStatusFilter ||
        m.status.toLowerCase().includes(this.movementStatusFilter.toLowerCase());
      const matchesMinQuantity = this.movementMinQuantityFilter === null || m.quantity >= this.movementMinQuantityFilter;
      const matchesMaxQuantity = this.movementMaxQuantityFilter === null || m.quantity <= this.movementMaxQuantityFilter;
      const matchesStartDate = !this.movementStartDateFilter ||
        new Date(m.date).getTime() >= new Date(this.movementStartDateFilter).getTime();
      const matchesEndDate = !this.movementEndDateFilter ||
        new Date(m.date).getTime() <= new Date(this.movementEndDateFilter).getTime();
      const matchesUser = !this.movementUserFilter ||
        m.createdBy.toLowerCase().includes(this.movementUserFilter.toLowerCase());
      return matchesType && matchesStatus && matchesMinQuantity && matchesMaxQuantity && matchesStartDate && matchesEndDate && matchesUser;
    });

    if (this.movementSortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.movementSortField as keyof WarehouseMovement];
        const valueB = b[this.movementSortField as keyof WarehouseMovement];
        if (this.movementSortField === 'date') {
          return this.movementSortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.movementSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.movementSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }

    return filtered;
  }

  loadMovements() {
    this.movementService.getAllMovements().subscribe({
      next: (data: any[]) => {
        this.movements = data.map(movement => ({
          ...movement,
          date: this.formatDate(movement.date),
          status: this.mapStatusFromApi(movement.status),
          productName: movement.productName || this.getProductName(movement.warehouseItemId),
          productCode: movement.productCode || this.getProductCode(movement.warehouseItemId),
          movementType: this.mapMovementTypeFromApi(movement.movementType)
        }));
      },
      error: (error: any) => {
        this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`;
      }
    });
  }

  getProductName(warehouseItemId: number): string {
    const product = this.products.find(p => p.id === warehouseItemId);
    return product ? product.name : 'Nieznany produkt';
  }

  getProductCode(warehouseItemId: number): string {
    const product = this.products.find(p => p.id === warehouseItemId);
    return product ? product.code : 'Brak kodu';
  }

  mapStatusFromApi(status: string): 'Zaplanowane' | 'W trakcie' | 'Zakończone' {
    switch (status) {
      case 'Planned':
        return 'Zaplanowane';
      case 'InProgress':
        return 'W trakcie';
      case 'Completed':
        return 'Zakończone';
      default:
        return 'Zakończone';
    }
  }

  mapMovementTypeFromApi(movementType: string): string {
    switch (movementType) {
      case WarehouseMovementType.PZ:
        return 'Przyjęcie Zewnętrzne';
      case WarehouseMovementType.PW:
        return 'Przyjęcie Wewnętrzne';
      case WarehouseMovementType.WZ:
        return 'Wydanie Zewnętrzne';
      case WarehouseMovementType.RW:
        return 'Rozchód Wewnętrzny';
      case WarehouseMovementType.MM:
        return 'Przesunięcie Międzymagazynowe';
      case WarehouseMovementType.ZW:
        return 'Zwrot Wewnętrzny';
      case WarehouseMovementType.ZK:
        return 'Zwrot Konsygnacyjny';
      case WarehouseMovementType.INW:
        return 'Inwentaryzacja';
      default:
        return movementType;
    }
  }

  mapMovementTypeForApi(movementType: string): string {
    switch (movementType) {
      case 'Przyjęcie Zewnętrzne':
        return WarehouseMovementType.PZ;
      case 'Przyjęcie Wewnętrzne':
        return WarehouseMovementType.PW;
      case 'Wydanie Zewnętrzne':
        return WarehouseMovementType.WZ;
      case 'Rozchód Wewnętrzny':
        return WarehouseMovementType.RW;
      case 'Przesunięcie Międzymagazynowe':
        return WarehouseMovementType.MM;
      case 'Zwrot Wewnętrzny':
        return WarehouseMovementType.ZW;
      case 'Zwrot Konsygnacyjny':
        return WarehouseMovementType.ZK;
      case 'Inwentaryzacja':
        return WarehouseMovementType.INW;
      default:
        return movementType;
    }
  }

  mapStatusForApi(status: 'Zaplanowane' | 'W trakcie' | 'Zakończone'): 'Planned' | 'InProgress' | 'Completed' {
    switch (status) {
      case 'Zaplanowane':
        return 'Planned';
      case 'W trakcie':
        return 'InProgress';
      case 'Zakończone':
        return 'Completed';
      default:
        return 'Planned';
    }
  }

  formatDateForApi(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString();
  }

  sortMovements(field: string) {
    if (this.movementSortField === field) {
      this.movementSortDirection = this.movementSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.movementSortField = field;
      this.movementSortDirection = 'asc';
    }
    this.applyFilters();
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const text = e.target?.result as string;
        const data = this.parseCSV(text);
        this.processBulkMovements(data);
      };
      reader.readAsText(file);
    }
  }

  parseCSV(csv: string): any[] {
    const lines = csv.split('\n');
    const result: any[] = [];
    const headers = lines[0].split(',').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"(.+)"$/, '$1'));
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        result.push(obj);
      }
    }
    return result;
  }

  processBulkMovements(data: any[]) {
    const movements = data.map(row => {
      let movementType = row.movementType;
      if (!Object.values(WarehouseMovementType).includes(movementType)) {
        movementType = this.mapMovementTypeForApi(movementType);
      }
      let status = row.status || 'Zakończone';
      return {
        warehouseItemId: parseInt(row.warehouseItemId, 10),
        movementType: movementType,
        quantity: parseInt(row.quantity, 10),
        supplier: row.supplier || '',
        documentNumber: row.documentNumber || this.generateDocumentNumber(),
        description: row.description || '',
        createdBy: this.currentUserFullName,
        status: this.mapStatusForApi(status as 'Zaplanowane' | 'W trakcie' | 'Zakończone'),
        comment: row.comment || '',
        date: this.formatDateForApi(new Date())
      };
    });

    movements.forEach((movement: any) => {
      this.movementService.createMovement(movement).subscribe({
        next: () => {
          this.loadMovements();
        },
        error: (error: any) => {
          this.errorMessage = error.error || `Błąd podczas masowego dodawania: ${error.status} - ${error.statusText}`;
        }
      });
    });
    this.successMessage = 'Masowe dodawanie ruchów zakończone.';
  }

  generateDocumentNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `DOC/${datePart}/${randomNum}`;
  }
}

interface WarehouseMovement {
  id: number;
  warehouseItemId: number;
  productName: string;
  productCode: string;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  date: string;
  createdBy: string;
  status: string;
  comment?: string;
  orderId?: number | null;
}

interface Product {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
}
