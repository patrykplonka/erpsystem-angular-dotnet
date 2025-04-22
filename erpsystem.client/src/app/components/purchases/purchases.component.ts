import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface PurchaseDto {
  id: number;
  purchaseNumber: string;
  contractorId: number;
  contractorName: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  createdBy: string;
  createdDate: string;
  isDeleted: boolean;
  purchaseItems: PurchaseItemDto[];
  selected?: boolean;
}

interface PurchaseItemDto {
  id: number;
  purchaseId: number;
  warehouseItemId: number;
  warehouseItemName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface PurchaseHistoryDto {
  action: string;
  modifiedBy: string;
  modifiedDate: string;
  details: string;
}

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.component.html',
  styleUrls: ['./purchases.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    SidebarComponent
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchasesComponent implements OnInit {
  purchases: PurchaseDto[] = [];
  filteredPurchases: PurchaseDto[] = [];
  selectedPurchase: PurchaseDto | null = null;
  purchaseToDelete: number | null = null;
  purchaseHistory: PurchaseHistoryDto[] = [];
  isLoading = false;
  showAddForm = false;
  showDeleted = false;
  hasSelectedPurchases = false;
  selectAll = false;
  sortColumn = 'purchaseNumber';
  sortDirection = 'asc';
  currentPage = 1;
  totalPages = 1;
  pageSize = 10;
  newPurchaseForm: FormGroup;
  editPurchaseForm: FormGroup;
  nameFilter = new BehaviorSubject<string>('');
  nameFilterValue = '';
  statusFilter = '';
  startDate = '';
  endDate = '';
  purchaseStatuses = [
    { value: '', display: 'Wszystkie' },
    { value: 'Draft', display: 'Szkic' },
    { value: 'Confirmed', display: 'Potwierdzone' },
    { value: 'InProgress', display: 'W trakcie' },
    { value: 'Received', display: 'Przyjęte' },
    { value: 'Cancelled', display: 'Anulowane' }
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    public router: Router, // Changed to public
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {
    this.newPurchaseForm = this.fb.group({
      purchaseNumber: ['', Validators.required],
      contractorId: ['', Validators.required],
      orderDate: ['', Validators.required],
      status: ['Draft', Validators.required],
      createdBy: ['', Validators.required],
      purchaseItems: this.fb.array([])
    });

    this.editPurchaseForm = this.fb.group({
      id: ['', Validators.required],
      purchaseNumber: ['', Validators.required],
      contractorId: ['', Validators.required],
      orderDate: ['', Validators.required],
      status: ['', Validators.required],
      createdBy: ['', Validators.required],
      purchaseItems: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadData();
    this.nameFilter.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.applyFilters());
  }

  public loadData() {
    this.isLoading = true;
    this.http.get<PurchaseDto[]>(`${environment.apiUrl}/purchases?showDeleted=${this.showDeleted}`).subscribe({
      next: (data) => {
        this.purchases = data.map(p => ({ ...p, selected: false }));
        this.filteredPurchases = this.purchases;
        this.totalPages = Math.ceil(this.purchases.length / this.pageSize);
        this.updateHasSelectedPurchases();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd ładowania danych.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredPurchases.forEach(p => p.selected = checked);
    this.selectAll = checked;
    this.updateHasSelectedPurchases();
  }

  updateHasSelectedPurchases() {
    this.hasSelectedPurchases = this.filteredPurchases.some(p => p.selected);
    this.cdr.markForCheck();
  }

  applyFilters() {
    this.nameFilter.next(this.nameFilterValue);
    this.filteredPurchases = this.purchases.filter(p => {
      const matchesName = this.nameFilterValue
        ? p.contractorName.toLowerCase().includes(this.nameFilterValue.toLowerCase())
        : true;
      const matchesStatus = this.statusFilter ? p.status === this.statusFilter : true;
      const matchesStartDate = this.startDate ? new Date(p.orderDate) >= new Date(this.startDate) : true;
      const matchesEndDate = this.endDate ? new Date(p.orderDate) <= new Date(this.endDate) : true;
      return matchesName && matchesStatus && matchesStartDate && matchesEndDate;
    });
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredPurchases.length / this.pageSize);
    this.updateHasSelectedPurchases();
    this.cdr.markForCheck();
  }

  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.filteredPurchases.sort((a, b) => {
      const valA = a[column as keyof PurchaseDto];
      const valB = b[column as keyof PurchaseDto];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return this.sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    this.cdr.markForCheck();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }

  deleteSelected() {
    const selectedIds = this.filteredPurchases.filter(p => p.selected).map(p => p.id);
    if (selectedIds.length === 0) return;
    this.isLoading = true;
    selectedIds.forEach(id => {
      this.http.delete(`${environment.apiUrl}/purchases/${id}`).subscribe({
        next: () => {
          this.purchases = this.purchases.filter(p => p.id !== id);
          this.applyFilters();
          this.snackBar.open('Wybrane zamówienia usunięte.', 'Zamknij', { duration: 3000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.snackBar.open(error.error.message || 'Błąd usuwania zamówienia.', 'Zamknij', { duration: 3000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  showDetails(purchase: PurchaseDto) {
    this.selectedPurchase = purchase;
    this.http.get<PurchaseHistoryDto[]>(`${environment.apiUrl}/purchases/${purchase.id}/history`).subscribe({
      next: (data) => {
        this.purchaseHistory = data;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd ładowania historii.', 'Zamknij', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }

  closeDetails() {
    this.selectedPurchase = null;
    this.purchaseHistory = [];
    this.cdr.markForCheck();
  }

  confirmDelete(id: number) {
    this.purchaseToDelete = id;
    this.cdr.markForCheck();
  }

  cancelDelete() {
    this.purchaseToDelete = null;
    this.cdr.markForCheck();
  }

  deletePurchase(id: number) {
    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/purchases/${id}`).subscribe({
      next: () => {
        this.purchases = this.purchases.filter(p => p.id !== id);
        this.applyFilters();
        this.purchaseToDelete = null;
        this.snackBar.open('Zamówienie usunięte.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd usuwania zamówienia.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  startEdit(purchase: PurchaseDto) {
    this.editPurchaseForm.patchValue(purchase);
    const items = this.editPurchaseForm.get('purchaseItems') as FormArray;
    items.clear();
    purchase.purchaseItems.forEach(item => {
      items.push(this.fb.group({
        id: [item.id],
        warehouseItemId: [item.warehouseItemId, Validators.required],
        warehouseItemName: [item.warehouseItemName],
        quantity: [item.quantity, Validators.required],
        unitPrice: [item.unitPrice, Validators.required],
        vatRate: [item.vatRate, Validators.required],
        totalPrice: [item.totalPrice]
      }));
    });
    this.cdr.markForCheck();
  }

  confirmPurchase(id: number) {
    this.isLoading = true;
    this.http.post(`${environment.apiUrl}/purchases/${id}/confirm`, {}).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open('Zamówienie potwierdzone.', 'Zamknij', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd potwierdzania zamówienia.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  receivePurchase(id: number) {
    this.isLoading = true;
    this.http.post(`${environment.apiUrl}/purchases/${id}/receive`, {}).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open('Zamówienie przyjęte.', 'Zamknij', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd przyjmowania zamówienia.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  restorePurchase(id: number) {
    this.isLoading = true;
    this.http.post(`${environment.apiUrl}/purchases/${id}/restore`, {}).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open('Zamówienie przywrócone.', 'Zamknij', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd przywracania zamówienia.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateStatus(purchase: PurchaseDto) {
    this.isLoading = true;
    this.http.put(`${environment.apiUrl}/purchases/${purchase.id}/status`, { status: purchase.status }).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open('Status zaktualizowany.', 'Zamknij', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(error.error.message || 'Błąd aktualizacji statusu.', 'Zamknij', { duration: 3000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStatusDisplay(status: string) {
    const statusObj = this.purchaseStatuses.find(s => s.value === status);
    return statusObj ? statusObj.display : status;
  }

  get purchaseItems() {
    return this.newPurchaseForm.get('purchaseItems') as FormArray;
  }

  get editPurchaseItems() {
    return this.editPurchaseForm.get('purchaseItems') as FormArray;
  }

  addPurchaseItem() {
    this.purchaseItems.push(this.fb.group({
      warehouseItemId: ['', Validators.required],
      warehouseItemName: [''],
      quantity: [1, Validators.required],
      unitPrice: [0, Validators.required],
      vatRate: [23, Validators.required],
      totalPrice: [0]
    }));
    this.cdr.markForCheck();
  }

  addEditPurchaseItem() {
    this.editPurchaseItems.push(this.fb.group({
      warehouseItemId: ['', Validators.required],
      warehouseItemName: [''],
      quantity: [1, Validators.required],
      unitPrice: [0, Validators.required],
      vatRate: [23, Validators.required],
      totalPrice: [0]
    }));
    this.cdr.markForCheck();
  }

  removePurchaseItem(index: number) {
    this.purchaseItems.removeAt(index);
    this.cdr.markForCheck();
  }

  removeEditPurchaseItem(index: number) {
    this.editPurchaseItems.removeAt(index);
    this.cdr.markForCheck();
  }

  submitNewPurchase() {
    if (this.newPurchaseForm.valid) {
      this.isLoading = true;
      this.http.post(`${environment.apiUrl}/purchases`, this.newPurchaseForm.value).subscribe({
        next: () => {
          this.loadData();
          this.newPurchaseForm.reset();
          this.showAddForm = false;
          this.snackBar.open('Zamówienie dodane.', 'Zamknij', { duration: 3000 });
        },
        error: (error) => {
          this.snackBar.open(error.error.message || 'Błąd dodawania zamówienia.', 'Zamknij', { duration: 3000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  submitEditPurchase() {
    if (this.editPurchaseForm.valid) {
      this.isLoading = true;
      this.http.put(`${environment.apiUrl}/purchases/${this.editPurchaseForm.value.id}`, this.editPurchaseForm.value).subscribe({
        next: () => {
          this.loadData();
          this.editPurchaseForm.reset();
          this.snackBar.open('Zamówienie zaktualizowane.', 'Zamknij', { duration: 3000 });
        },
        error: (error) => {
          this.snackBar.open(error.error.message || 'Błąd aktualizacji zamówienia.', 'Zamknij', { duration: 3000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }
}
