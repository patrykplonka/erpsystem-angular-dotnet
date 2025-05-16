import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { saveAs } from 'file-saver';
import { catchError, retry, throwError } from 'rxjs';

interface InvoiceDto {
  id: number;
  orderId: number;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  contractorId: number;
  contractorName: string;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  status: string;
  filePath: string | null;
  createdDate: Date;
  createdBy: string;
  invoiceType: string;
  relatedInvoiceId?: number;
  advanceAmount?: number;
  kSeFId?: string;
  isSendingToKSeF?: boolean; // Added for per-invoice loading state
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.css']
})
export class InvoicesComponent implements OnInit {
  invoices: InvoiceDto[] = [];
  filteredInvoices: InvoiceDto[] = [];
  currentUserEmail: string | null = null;
  currentUserFullName = 'Unknown';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  invoiceSortField: keyof InvoiceDto = 'invoiceNumber';
  invoiceSortDirection: 'asc' | 'desc' = 'asc';
  invoiceStatusFilter = '';
  invoiceStartDateFilter: string | null = null;
  invoiceEndDateFilter: string | null = null;
  invoiceUserFilter = '';
  invoiceTypeFilter: string = 'all';
  isLoading: boolean = false;
  apiUrl = 'https://localhost:7224/api/invoice';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
    this.loadInvoices();
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

  loadInvoices() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.invoices = [];
    this.filteredInvoices = [];
    const url = this.invoiceTypeFilter === 'all'
      ? this.apiUrl
      : `${this.apiUrl}?invoiceType=${this.invoiceTypeFilter}`;
    console.log('Request URL:', url);
    console.log('Headers:', this.getHeaders());

    this.http.get<InvoiceDto[]>(url, { headers: this.getHeaders() })
      .pipe(
        retry(2),
        catchError((error) => {
          let errorMsg = `Błąd ładowania faktur: ${error.status} ${error.message}`;
          console.error('Error details:', error);
          if (error.status === 0) {
            errorMsg = 'Brak połączenia z serwerem. Sprawdź, czy backend działa na https://localhost:7224.';
          } else if (error.status === 401) {
            errorMsg = 'Brak autoryzacji. Zaloguj się ponownie.';
            this.authService.logout();
            this.router.navigate(['login']);
          } else if (error.status === 403) {
            errorMsg = 'Brak uprawnień do wyświetlenia faktur.';
          } else if (error.status === 404) {
            errorMsg = 'Endpoint api/invoice nie znaleziony. Sprawdź konfigurację InvoiceController.';
          }
          this.errorMessage = errorMsg;
          this.isLoading = false;
          this.cdr.detectChanges();
          return throwError(() => new Error(errorMsg));
        })
      )
      .subscribe({
        next: (data) => {
          console.log('Received invoices:', data);
          this.invoices = data.map(invoice => ({
            ...invoice,
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
            createdDate: new Date(invoice.createdDate),
            status: this.mapStatusFromApi(invoice.status),
            invoiceType: this.mapInvoiceTypeFromApi(invoice.invoiceType),
            isSendingToKSeF: false
          }));
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
          this.errorMessage = null;
        }
      });
  }

  sendToKSeF(invoice: InvoiceDto) {
    if (invoice.kSeFId) {
      this.errorMessage = `Faktura ${invoice.invoiceNumber} została już wysłana do KSeF (ID: ${invoice.kSeFId}).`;
      this.successMessage = null;
      this.cdr.detectChanges();
      return;
    }

    invoice.isSendingToKSeF = true;
    this.cdr.detectChanges();

    this.http.post<{ kSeFId: string }>(`${this.apiUrl}/send-to-ksef/${invoice.id}`, {}, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          let errorMsg = `Błąd wysyłania faktury ${invoice.invoiceNumber} do KSeF: ${error.status} `;
          if (error.status === 503) {
            errorMsg += error.error || 'Nie można połączyć się z KSeF. Sprawdź połączenie internetowe.';
          } else if (error.status === 404) {
            errorMsg = `Faktura ${invoice.invoiceNumber} nie znaleziona.`;
          } else if (error.status === 400) {
            errorMsg = error.error || `Faktura ${invoice.invoiceNumber} została już wysłana do KSeF.`;
          } else if (error.status === 401) {
            errorMsg = 'Brak autoryzacji. Zaloguj się ponownie.';
            this.authService.logout();
            this.router.navigate(['login']);
          } else {
            errorMsg += error.message;
          }
          this.errorMessage = errorMsg;
          this.successMessage = null;
          invoice.isSendingToKSeF = false;
          this.cdr.detectChanges();
          return throwError(() => new Error(errorMsg));
        })
      )
      .subscribe({
        next: (response) => {
          invoice.kSeFId = response.kSeFId;
          this.successMessage = `Faktura ${invoice.invoiceNumber} wysłana do KSeF (ID: ${response.kSeFId}).`;
          this.errorMessage = null;
          invoice.isSendingToKSeF = false;
          this.cdr.detectChanges();
        },
        error: () => {
          invoice.isSendingToKSeF = false;
          this.cdr.detectChanges();
        }
      });
  }

  downloadInvoice(invoice: InvoiceDto) {
    this.http.get(`${this.apiUrl}/${invoice.id}/download`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    })
      .pipe(
        catchError((error) => {
          let errorMsg = `Błąd pobierania faktury ${invoice.invoiceNumber}: ${error.status} ${error.message}`;
          if (error.status === 404) {
            errorMsg = `Faktura ${invoice.invoiceNumber} nie znaleziona lub plik PDF nie istnieje.`;
          } else if (error.status === 401) {
            errorMsg = 'Brak autoryzacji. Zaloguj się ponownie.';
            this.authService.logout();
            this.router.navigate(['login']);
          }
          this.errorMessage = errorMsg;
          this.successMessage = null;
          return throwError(() => new Error(errorMsg));
        })
      )
      .subscribe({
        next: (blob) => {
          saveAs(blob, `${invoice.invoiceType}_Invoice_${invoice.invoiceNumber}.pdf`);
          this.successMessage = `Faktura ${invoice.invoiceNumber} pobrana.`;
          this.errorMessage = null;
        }
      });
  }

  formatDate(date: Date): string {
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  mapStatusFromApi(status: string): string {
    switch (status) {
      case 'Draft': return 'Szkic';
      case 'Issued': return 'Wystawiona';
      case 'Paid': return 'Zapłacona';
      case 'Overdue': return 'Zaległa';
      default: return status;
    }
  }

  mapInvoiceTypeFromApi(type: string): string {
    switch (type) {
      case 'Sales': return 'Sprzedaż';
      case 'Purchase': return 'Zakup';
      case 'Corrective': return 'Korygująca';
      case 'Proforma': return 'Proforma';
      case 'Advance': return 'Zaliczkowa';
      case 'Final': return 'Końcowa';
      default: return type;
    }
  }

  applyFilters() {
    this.filteredInvoices = [...this.invoices].filter(i => {
      const matchesStatus = !this.invoiceStatusFilter ||
        this.mapStatusFromApi(i.status).toLowerCase().includes(this.invoiceStatusFilter.toLowerCase());
      const matchesStartDate = !this.invoiceStartDateFilter ||
        new Date(i.issueDate) >= new Date(this.invoiceStartDateFilter);
      const matchesEndDate = !this.invoiceEndDateFilter ||
        new Date(i.issueDate) <= new Date(this.invoiceEndDateFilter);
      const matchesUser = !this.invoiceUserFilter ||
        i.createdBy.toLowerCase().includes(this.invoiceUserFilter.toLowerCase());
      return matchesStatus && matchesStartDate && matchesEndDate && matchesUser;
    });

    this.filteredInvoices.sort((a, b) => {
      const valueA = a[this.invoiceSortField];
      const valueB = b[this.invoiceSortField];
      if (this.invoiceSortField === 'issueDate' || this.invoiceSortField === 'dueDate' || this.invoiceSortField === 'createdDate') {
        return this.invoiceSortDirection === 'asc'
          ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
          : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
      }
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return this.invoiceSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.invoiceSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }
      return 0;
    });
    this.cdr.detectChanges();
  }

  sortInvoices(field: keyof InvoiceDto) {
    if (this.invoiceSortField === field) {
      this.invoiceSortDirection = this.invoiceSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.invoiceSortField = field;
      this.invoiceSortDirection = 'asc';
    }
    this.applyFilters();
  }

  setFilter(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.invoiceTypeFilter = target.value;
    this.resetFilters();
    this.loadInvoices();
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
      this.invoiceTypeFilter = typeMap[page];
      this.resetFilters();
      this.loadInvoices();
    } else {
      this.invoiceTypeFilter = 'all';
      this.resetFilters();
      this.loadInvoices();
      this.router.navigate([`/${page}`]);
    }
  }

  resetFilters() {
    this.invoiceStatusFilter = '';
    this.invoiceStartDateFilter = null;
    this.invoiceEndDateFilter = null;
    this.invoiceUserFilter = '';
  }

  trackByInvoiceId(index: number, invoice: InvoiceDto): number {
    return invoice.id;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['login']);
  }
}
