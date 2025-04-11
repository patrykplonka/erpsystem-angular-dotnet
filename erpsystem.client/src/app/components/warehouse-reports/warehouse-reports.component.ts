import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-warehouse-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './warehouse-reports.component.html',
  styleUrls: ['./warehouse-reports.component.css']
})
export class WarehouseReportsComponent implements OnInit {
  warehouseItems: WarehouseItemDto[] = [];
  currentUserEmail: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  operationLogs: OperationLog[] = [];
  historyUserFilter: string = '';
  historyStartDateFilter: string = '';
  historyEndDateFilter: string = '';
  historyItemFilter: string = '';
  historySortField: string = '';
  historySortDirection: 'asc' | 'desc' = 'asc';
  currentReport: string | null = null;
  movementStartDate: string = '';
  movementEndDate: string = '';
  movementsInPeriod: WarehouseMovement[] = [];
  popularProducts: { name: string; issueCount: number }[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadItems();
    this.loadOperationLogs();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
  }

  setReport(report: string) {
    this.currentReport = report;
    if (report === 'popular') {
      this.loadPopularProducts();
    } else if (report === 'movements') {
      this.movementsInPeriod = [];
    } else if (report === 'history') {
      this.loadOperationLogs(); // Ensure fresh data when selecting history
    }
  }

  formatDate(date: string | Date | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatVatRate(vatRate: number): string {
    return `${(vatRate * 100).toFixed(0)}%`;
  }

  loadOperationLogs() {
    this.http
      .get<OperationLog[]>('https://localhost:7224/api/warehouse/operation-logs')
      .subscribe({
        next: (data) => (this.operationLogs = data),
        error: (error) =>
          (this.errorMessage = `Błąd ładowania historii: ${error.status} ${error.message}`)
      });
  }

  applyHistoryFilters() {
    this.sortHistory(this.historySortField);
  }

  get filteredOperationLogs(): OperationLog[] {
    let filtered = this.operationLogs.filter((log) => {
      const matchesUser =
        !this.historyUserFilter ||
        log.user.toLowerCase().includes(this.historyUserFilter.toLowerCase());
      const matchesStartDate =
        !this.historyStartDateFilter ||
        new Date(log.timestamp).getTime() >=
        new Date(this.historyStartDateFilter).getTime();
      const matchesEndDate =
        !this.historyEndDateFilter ||
        new Date(log.timestamp).getTime() <=
        new Date(this.historyEndDateFilter).getTime();
      const matchesItem =
        !this.historyItemFilter ||
        log.itemName.toLowerCase().includes(this.historyItemFilter.toLowerCase()) ||
        log.itemId.toString().includes(this.historyItemFilter);
      return matchesUser && matchesStartDate && matchesEndDate && matchesItem;
    });

    if (this.historySortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.historySortField as keyof OperationLog];
        const valueB = b[this.historySortField as keyof OperationLog];
        if (this.historySortField === 'timestamp') {
          return this.historySortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.historySortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        return 0;
      });
    }

    return filtered;
  }

  loadItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse').subscribe({
      next: (data) => {
        this.warehouseItems = data;
      },
      error: (error) =>
        (this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}`)
    });
  }

  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.filteredOperationLogs.map((log) => ({
        ID: log.id,
        Użytkownik: log.user,
        Operacja: log.operation,
        Produkt: log.itemName,
        'ID Produktu': log.itemId,
        Data: this.formatDate(log.timestamp),
        Szczegóły: log.details
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operation Logs');
    XLSX.writeFile(workbook, 'warehouse_operation_logs.xlsx');
  }

  sortHistory(field: string) {
    if (this.historySortField === field) {
      this.historySortDirection = this.historySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.historySortField = field;
      this.historySortDirection = 'asc';
    }
    this.applyHistoryFilters();
  }

  loadMovementsInPeriod() {
    const start = this.movementStartDate;
    const end = this.movementEndDate;
    if (!start || !end) {
      this.errorMessage = 'Obie daty są wymagane.';
      return;
    }
    this.http
      .get<WarehouseMovement[]>(
        `https://localhost:7224/api/warehousemovements/period?start=${start}&end=${end}`
      )
      .subscribe({
        next: (data) => {
          this.movementsInPeriod = data.map((movement) => {
            const item = this.warehouseItems.find((i) => i.id === movement.warehouseItemId);
            return {
              ...movement,
              warehouseItemName: item?.name || 'Nieznany',
              productCode: item?.code || 'Brak',
              category: item?.category || 'Brak',
              location: item?.location || 'Brak',
              warehouse: item?.warehouse || 'Brak',
              unitOfMeasure: item?.unitOfMeasure || 'Brak',
              minimumStock: item?.minimumStock || 0,
              supplier: item?.supplier || '-',
              batchNumber: item?.batchNumber || '-',
              expirationDate: item?.expirationDate ? this.formatDate(item.expirationDate) : '-',
              purchaseCost: item?.purchaseCost || 0,
              vatRate: item?.vatRate ? this.formatVatRate(item.vatRate) : '0%'
            };
          });
          this.successMessage = 'Załadowano ruchy w okresie.';
          this.errorMessage = null;
        },
        error: (error) =>
          (this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`)
      });
  }

  loadPopularProducts() {
    this.http
      .get<WarehouseMovement[]>('https://localhost:7224/api/warehousemovements')
      .subscribe({
        next: (movements) => {
          const issueMovements = movements.filter((m) => m.movementType.includes('Wydanie'));
          const productIssueCount = issueMovements.reduce(
            (acc, m) => {
              acc[m.warehouseItemId] = (acc[m.warehouseItemId] || 0) + 1;
              return acc;
            },
            {} as Record<number, number>
          );

          this.popularProducts = this.warehouseItems
            .map((item) => ({
              name: item.name,
              issueCount: productIssueCount[item.id] || 0
            }))
            .sort((a, b) => b.issueCount - a.issueCount);
        },
        error: (error) =>
          (this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`)
      });
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
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
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  supplier: string;
  batchNumber: string;
  expirationDate: string | null;
  purchaseCost: number;
  vatRate: number;
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

interface WarehouseMovement {
  id: number;
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  date: string;
  createdBy: string;
  status: 'Zaplanowane' | 'W trakcie' | 'Zakończone';
  comment?: string;
  warehouseItemName?: string;
  productCode?: string;
  category?: string;
  location?: string;
  warehouse?: string;
  unitOfMeasure?: string;
  minimumStock?: number;
  supplierItem?: string;
  batchNumber?: string;
  expirationDate?: string;
  purchaseCost?: number;
  vatRate?: string;
}
