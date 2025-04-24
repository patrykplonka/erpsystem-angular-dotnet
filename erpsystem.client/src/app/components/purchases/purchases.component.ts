import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Purchase {
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
  purchaseItems: PurchaseItem[];
  selected?: boolean;
}

interface PurchaseItem {
  id: number;
  purchaseId: number;
  warehouseItemId: number;
  warehouseItemName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface Contractor {
  id: number;
  name: string;
  type: string;
}

interface WarehouseItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface PurchaseHistory {
  id: number;
  purchaseId: number;
  action: string;
  modifiedBy: string;
  modifiedDate: string;
  details: string;
}

interface Status {
  value: string;
  display: string;
}

@Component({
  selector: 'app-purchases',
  templateUrl: './purchases.component.html',
  styleUrls: ['./purchases.component.css']
})
export class PurchasesComponent implements OnInit {
  isLoading = false;
  isLoadingWarehouseItems = false;
  showAddForm = false;
  showDeleted = false;
  hasSelectedPurchases = false;
  selectAll = false;
  nameFilterValue = '';
  statusFilter = '';
  startDate: string | null = null;
  endDate: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  sortColumn = 'purchaseNumber';
  sortDirection = 'asc';

  newPurchaseForm: FormGroup;
  editPurchaseForm: FormGroup;
  purchases: Purchase[] = [];
  filteredPurchases: Purchase[] = [];
  contractors: Contractor[] = [];
  warehouseItems: WarehouseItem[] = [];
  selectedPurchase: Purchase | null = null;
  purchaseToDelete: number | null = null;
  purchaseHistory: PurchaseHistory[] = [];
  purchaseStatuses: Status[] = [
    { value: '', display: 'Wszystkie' },
    { value: 'Draft', display: 'Szkic' },
    { value: 'Confirmed', display: 'Potwierdzone' },
    { value: 'Received', display: 'Przyjęte' }
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public router: Router
  ) {
    this.newPurchaseForm = this.fb.group({
      purchaseNumber: ['', Validators.required],
      contractorId: ['', Validators.required],
      orderDate: ['', Validators.required],
      createdBy: ['', Validators.required],
      purchaseItems: this.fb.array([])
    });

    this.editPurchaseForm = this.fb.group({
      id: [0],
      purchaseNumber: ['', Validators.required],
      contractorId: ['', Validators.required],
      orderDate: ['', Validators.required],
      createdBy: ['', Validators.required],
      purchaseItems: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadContractors();
    this.loadWarehouseItems();
  }

  get purchaseItems(): FormArray {
    return this.newPurchaseForm.get('purchaseItems') as FormArray;
  }

  get editPurchaseItems(): FormArray {
    return this.editPurchaseForm.get('purchaseItems') as FormArray;
  }

  loadData(): void {
    this.isLoading = true;
    this.http.get<Purchase[]>(`api/purchases?showDeleted=${this.showDeleted}`).subscribe({
      next: (data) => {
        this.purchases = data.map(p => ({ ...p, selected: false }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadContractors(): void {
    this.http.get<Contractor[]>('api/contractors').subscribe({
      next: (data) => {
        this.contractors = data.filter(c => c.type === 'Supplier' || c.type === 'Both');
      }
    });
  }

  loadWarehouseItems(): void {
    this.isLoadingWarehouseItems = true;
    this.http.get<WarehouseItem[]>('api/warehouseitems').subscribe({
      next: (data) => {
        this.warehouseItems = data;
        this.isLoadingWarehouseItems = false;
      },
      error: () => {
        this.isLoadingWarehouseItems = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredPurchases = this.purchases.filter(p => {
      const matchesName = this.nameFilterValue ? p.contractorName.toLowerCase().includes(this.nameFilterValue.toLowerCase()) : true;
      const matchesStatus = this.statusFilter ? p.status === this.statusFilter : true;
      const matchesStartDate = this.startDate ? new Date(p.orderDate) >= new Date(this.startDate) : true;
      const matchesEndDate = this.endDate ? new Date(p.orderDate) <= new Date(this.endDate) : true;
      return matchesName && matchesStatus && matchesStartDate && matchesEndDate;
    });

    this.sortTable(this.sortColumn);
    this.totalPages = Math.ceil(this.filteredPurchases.length / this.pageSize);
    this.currentPage = 1;
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredPurchases.sort((a, b) => {
      const valA = a[column as keyof Purchase];
      const valB = b[column as keyof Purchase];
      const modifier = this.sortDirection === 'asc' ? 1 : -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * modifier;
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * modifier;
      }
      return 0;
    });
  }

  addPurchaseItem(): void {
    const item = this.fb.group({
      warehouseItemId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, Validators.required],
      vatRate: [23, [Validators.required, Validators.min(0)]],
      totalPrice: [0, Validators.required]
    });
    this.purchaseItems.push(item);
  }

  removePurchaseItem(index: number): void {
    this.purchaseItems.removeAt(index);
  }

  addEditPurchaseItem(): void {
    const item = this.fb.group({
      warehouseItemId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, Validators.required],
      vatRate: [23, [Validators.required, Validators.min(0)]],
      totalPrice: [0, Validators.required]
    });
    this.editPurchaseItems.push(item);
  }

  removeEditPurchaseItem(index: number): void {
    this.editPurchaseItems.removeAt(index);
  }

  updatePurchaseItem(control: AbstractControl): void {
    const item = control as FormGroup;
    const warehouseItemId = item.get('warehouseItemId')?.value;
    const quantity = item.get('quantity')?.value || 1;
    const vatRate = item.get('vatRate')?.value || 23;

    if (warehouseItemId) {
      const warehouseItem = this.warehouseItems.find(wi => wi.id === warehouseItemId);
      if (warehouseItem) {
        const unitPrice = warehouseItem.price;
        const totalPrice = quantity * unitPrice * (1 + vatRate / 100);
        item.patchValue({
          unitPrice,
          totalPrice
        });
      }
    }
  }

  updateEditPurchaseItem(control: AbstractControl): void {
    const item = control as FormGroup;
    const warehouseItemId = item.get('warehouseItemId')?.value;
    const quantity = item.get('quantity')?.value || 1;
    const vatRate = item.get('vatRate')?.value || 23;

    if (warehouseItemId) {
      const warehouseItem = this.warehouseItems.find(wi => wi.id === warehouseItemId);
      if (warehouseItem) {
        const unitPrice = warehouseItem.price;
        const totalPrice = quantity * unitPrice * (1 + vatRate / 100);
        item.patchValue({
          unitPrice,
          totalPrice
        });
      }
    }
  }

  submitNewPurchase(): void {
    if (this.newPurchaseForm.valid) {
      this.isLoading = true;
      this.http.post<Purchase>('api/purchases', this.newPurchaseForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.showAddForm = false;
          this.newPurchaseForm.reset();
          this.purchaseItems.clear();
          this.loadData();
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  submitEditPurchase(): void {
    if (this.editPurchaseForm.valid) {
      this.isLoading = true;
      const id = this.editPurchaseForm.get('id')?.value;
      this.http.put(`api/purchases/${id}`, this.editPurchaseForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.editPurchaseForm.reset();
          this.editPurchaseItems.clear();
          this.loadData();
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
  }

  startEdit(purchase: Purchase): void {
    this.editPurchaseForm.patchValue({
      id: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      contractorId: purchase.contractorId,
      orderDate: purchase.orderDate,
      createdBy: purchase.createdBy
    });

    this.editPurchaseItems.clear();
    purchase.purchaseItems.forEach(item => {
      this.editPurchaseItems.push(this.fb.group({
        warehouseItemId: [item.warehouseItemId, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        unitPrice: [item.unitPrice, Validators.required],
        vatRate: [item.vatRate, [Validators.required, Validators.min(0)]],
        totalPrice: [item.totalPrice, Validators.required]
      }));
    });
  }

  confirmDelete(id: number): void {
    this.purchaseToDelete = id;
  }

  deletePurchase(id: number): void {
    this.isLoading = true;
    this.http.delete(`api/purchases/${id}`).subscribe({
      next: () => {
        this.isLoading = false;
        this.purchaseToDelete = null;
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancelDelete(): void {
    this.purchaseToDelete = null;
  }

  deleteSelected(): void {
    const selectedIds = this.purchases.filter(p => p.selected).map(p => p.id);
    if (selectedIds.length > 0) {
      this.isLoading = true;
      const deleteRequests = selectedIds.map(id => this.http.delete(`api/purchases/${id}`).toPromise());
      Promise.all(deleteRequests).then(() => {
        this.isLoading = false;
        this.loadData();
      }).catch(() => {
        this.isLoading = false;
      });
    }
  }

  confirmPurchase(id: number): void {
    this.isLoading = true;
    this.http.post(`api/purchases/confirm/${id}`, {}).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  receivePurchase(id: number): void {
    this.isLoading = true;
    this.http.post(`api/purchases/receive/${id}`, {}).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  restorePurchase(id: number): void {
    this.isLoading = true;
    this.http.post(`api/purchases/${id}/restore`, {}).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  updateStatus(purchase: Purchase): void {
    this.isLoading = true;
    this.http.put(`api/purchases/${purchase.id}/status`, { status: purchase.status }).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadData();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  showDetails(purchase: Purchase): void {
    this.selectedPurchase = purchase;
    this.http.get<PurchaseHistory[]>(`api/purchases/${purchase.id}/history`).subscribe({
      next: (data) => {
        this.purchaseHistory = data;
      }
    });
  }

  closeDetails(): void {
    this.selectedPurchase = null;
    this.purchaseHistory = [];
  }

  toggleSelectAll(event: Event): void {
    this.selectAll = (event.target as HTMLInputElement).checked;
    this.purchases.forEach(p => p.selected = this.selectAll);
    this.updateHasSelectedPurchases();
  }

  updateHasSelectedPurchases(): void {
    this.hasSelectedPurchases = this.purchases.some(p => p.selected);
    this.selectAll = this.purchases.every(p => p.selected);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  getStatusDisplay(status: string): string {
    const statusObj = this.purchaseStatuses.find(s => s.value === status);
    return statusObj ? statusObj.display : status;
  }
}
