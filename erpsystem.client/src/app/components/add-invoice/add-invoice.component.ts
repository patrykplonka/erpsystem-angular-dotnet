import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';

interface InvoiceDto {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  contractorId: number;
  contractorName: string;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  status: string;
  invoiceType: string;
  relatedInvoiceId?: number;
  advanceAmount?: number;
  description?: string;
  items: InvoiceItemDto[];
}

interface InvoiceItemDto {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ContractorDto {
  id: number;
  name: string;
  nip?: string;
  taxId?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface ProductDto {
  id: number;
  name: string;
  unitPrice: number;
  code?: string;
}

@Component({
  selector: 'app-add-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SidebarComponent],
  templateUrl: './add-invoice.component.html',
  styleUrls: ['./add-invoice.component.css']
})
export class AddInvoiceComponent implements OnInit {
  invoiceForm: FormGroup;
  contractors: ContractorDto[] = [];
  products: ProductDto[] = [];
  relatedInvoices: InvoiceDto[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  apiUrl = 'https://localhost:7224/api/invoice';
  contractorApiUrl = 'https://localhost:7224/api/Contractors';
  productApiUrl = 'https://localhost:7224/api/Warehouse';
  selectedContractor: ContractorDto | null = null;
  selectedContractorId: number | null = null;
  selectedProduct: { productId: number; productName: string; productCode: string; unitPrice: number; quantity: number } = {
    productId: 0,
    productName: '',
    productCode: '',
    unitPrice: 0,
    quantity: 0
  };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.invoiceForm = this.fb.group({
      invoiceNumber: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\-\/]+$/)]],
      issueDate: ['', Validators.required],
      dueDate: ['', Validators.required],
      contractorId: [''],
      totalAmount: [0, [Validators.required, Validators.min(0)]],
      vatAmount: [0, [Validators.required, Validators.min(0)]],
      netAmount: [0, [Validators.required, Validators.min(0)]],
      status: ['Draft', Validators.required],
      invoiceType: ['Sales', Validators.required],
      relatedInvoiceId: [null],
      advanceAmount: [null, Validators.min(0)],
      description: [''],
      items: this.fb.array([])
    });
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  getItemFormGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  addItem(productId: number, productName: string, quantity: number, unitPrice: number) {
    const totalPrice = quantity * unitPrice;
    const item = this.fb.group({
      productId: [productId, Validators.required],
      productName: [productName, Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
      totalPrice: [totalPrice, [Validators.required, Validators.min(0)]]
    });
    this.items.push(item);
    this.updateSummary();
  }

  removeItem(index: number) {
    this.items.removeAt(index);
    this.updateSummary();
  }

  updateSummary() {
    const items = this.items.value as InvoiceItemDto[];
    const netAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const vatRate = 0.23;
    const vatAmount = netAmount * vatRate;
    const totalAmount = netAmount + vatAmount;

    this.invoiceForm.patchValue({
      netAmount: netAmount,
      vatAmount: vatAmount,
      totalAmount: totalAmount
    });
  }

  ngOnInit() {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
    this.route.queryParams.subscribe(params => {
      const invoiceType = params['type'] || 'Sales';
      this.invoiceForm.patchValue({ invoiceType });
      this.loadContractors();
      this.loadProducts();
      if (invoiceType === 'Corrective' || invoiceType === 'Final') {
        this.loadRelatedInvoices();
      }
      this.generateInvoiceNumber(invoiceType);
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      this.errorMessage = 'Brak tokenu autoryzacji. Zaloguj się ponownie.';
      this.authService.logout();
      this.router.navigate(['login']);
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  generateInvoiceNumber(invoiceType: string) {
    const prefixMap: { [key: string]: string } = {
      'Sales': 'FS',
      'Purchase': 'FP',
      'Corrective': 'FC',
      'Proforma': 'FPR',
      'Advance': 'FA',
      'Final': 'FF'
    };
    const prefix = prefixMap[invoiceType] || 'F';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    const invoiceNumber = `${prefix}/${datePart}/1`;
    this.invoiceForm.patchValue({ invoiceNumber });
  }

  loadContractors() {
    this.isLoading = true;
    this.http.get<ContractorDto[]>(this.contractorApiUrl, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Error loading contractors:', error);
          let errorDetails = 'Nieznany błąd';
          if (error.status === 404) {
            errorDetails = 'Endpoint /api/Contractors nie istnieje. Sprawdź konfigurację backendu.';
          } else if (error.status === 401) {
            errorDetails = 'Nieautoryzowany dostęp. Sprawdź token.';
            this.authService.logout();
            this.router.navigate(['login']);
          } else {
            errorDetails = `Błąd serwera: ${error.status} ${error.statusText}`;
          }
          this.errorMessage = `Błąd ładowania kontrahentów: ${errorDetails}`;
          this.isLoading = false;
          return throwError(() => new Error(this.errorMessage ?? ''));
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Contractors loaded:', data);
          this.contractors = data;
          this.isLoading = false;
          if (this.selectedContractorId) {
            this.onContractorChange();
          }
        }
      });
  }

  loadProducts() {
    this.isLoading = true;
    this.http.get<ProductDto[]>(this.productApiUrl, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Error loading products:', error);
          let errorDetails = 'Nieznany błąd';
          if (error.status === 404) {
            errorDetails = 'Endpoint /api/Warehouse nie istnieje. Sprawdź konfigurację backendu.';
          } else if (error.status === 401) {
            errorDetails = 'Nieautoryzowany dostęp. Sprawdź token.';
            this.authService.logout();
            this.router.navigate(['login']);
          } else {
            errorDetails = `Błąd serwera: ${error.status} ${error.statusText}`;
          }
          this.errorMessage = `Błąd ładowania produktów: ${errorDetails}`;
          this.isLoading = false;
          return throwError(() => new Error(this.errorMessage ?? ''));
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Products loaded:', data);
          this.products = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadRelatedInvoices() {
    this.isLoading = true;
    const typeFilter = this.invoiceForm.get('invoiceType')?.value === 'Corrective' ? 'Sales' : 'Advance';
    this.http.get<InvoiceDto[]>(`${this.apiUrl}?invoiceType=${typeFilter}`, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Error loading related invoices:', error);
          this.errorMessage = `Błąd ładowania powiązanych faktur: ${error.status} ${error.statusText}`;
          this.isLoading = false;
          return throwError(() => new Error(this.errorMessage ?? ''));
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Related invoices loaded:', data);
          this.relatedInvoices = data;
          this.isLoading = false;
        }
      });
  }

  onSubmit() {
    if (this.invoiceForm.invalid) {
      this.errorMessage = 'Proszę wypełnić wszystkie wymagane pola poprawnie.';
      return;
    }
    if (!this.selectedContractorId) {
      this.errorMessage = 'Wybierz kontrahenta.';
      return;
    }

    this.isLoading = true;

    const invoiceData: InvoiceDto = {
      ...this.invoiceForm.value,
      issueDate: new Date(this.invoiceForm.value.issueDate).toISOString().split('T')[0],
      dueDate: new Date(this.invoiceForm.value.dueDate).toISOString().split('T')[0],
      contractorId: this.selectedContractorId,
      contractorName: this.contractors.find(c => c.id === this.selectedContractorId)?.name || '',
      id: 0,
      items: this.items.value
    };

    console.log('Invoice data being sent:', invoiceData);

    this.http.post(this.apiUrl, invoiceData, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Error adding invoice:', error);
          const errorDetails = error.error?.message || error.message || 'Nieznany błąd';
          this.errorMessage = `Błąd podczas dodawania faktury: ${error.status} ${errorDetails}`;
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['login']);
          }
          this.isLoading = false;
          return throwError(() => new Error(this.errorMessage ?? ''));
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = `Faktura ${invoiceData.invoiceNumber} została dodana.`;
          this.errorMessage = null;
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/invoices'], { queryParams: { type: this.invoiceForm.value.invoiceType } }), 2000);
        }
      });
  }

  cancel() {
    this.router.navigate(['/invoices'], { queryParams: { type: this.invoiceForm.value.invoiceType } });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['login']);
  }

  navigateTo(page: string) {
    const typeMap: { [key: string]: string } = {
      'sales-invoices': 'Sales',
      'purchase-invoices': 'Purchase',
      'corrective-invoices': 'Corrective',
      'proforma-invoices': 'Proforma',
      'advance-invoices': 'Advance',
      'final-invoices': 'Final'
    };

    if (typeMap[page]) {
      this.invoiceForm.patchValue({ invoiceType: typeMap[page] });
      this.router.navigate(['/invoices'], { queryParams: { type: typeMap[page] } });
    } else {
      this.router.navigate([`/${page}`]);
    }
  }

  onContractorChange() {
    this.selectedContractor = this.contractors.find(c => c.id === this.selectedContractorId) || null;
    this.cdr.detectChanges();
  }

  onProductChange() {
    const selectedId = Number(this.selectedProduct.productId);
    const product = this.products.find(p => p.id === selectedId);
    if (product) {
      this.selectedProduct.productName = product.name;
      this.selectedProduct.productCode = product.code || '';
      this.selectedProduct.unitPrice = product.unitPrice || 0;
      console.log('Selected product:', this.selectedProduct);
    } else {
      this.selectedProduct.productName = '';
      this.selectedProduct.productCode = '';
      this.selectedProduct.unitPrice = 0;
    }
    this.cdr.detectChanges();
  }

  addProductToList() {
    if (this.selectedProduct.productId <= 0) {
      this.errorMessage = 'Wybierz produkt.';
      return;
    }
    if (this.selectedProduct.quantity <= 0) {
      this.errorMessage = 'Podaj ilość większą od zera.';
      return;
    }

    this.addItem(
      this.selectedProduct.productId,
      this.selectedProduct.productName,
      this.selectedProduct.quantity,
      this.selectedProduct.unitPrice
    );
    this.selectedProduct = {
      productId: 0,
      productName: '',
      productCode: '',
      unitPrice: 0,
      quantity: 0
    };
    this.successMessage = 'Produkt dodano do listy.';
    this.errorMessage = null;
    this.cdr.detectChanges();
  }
}
