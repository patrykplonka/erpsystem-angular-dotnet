import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

interface InvoiceDto {
  id: number;
  orderId: number;
  invoiceNumber: string;
  invoiceType: string;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  status: string;
  createdBy: string;
  relatedInvoiceId?: number;
  advanceAmount?: number;
}

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css'],
  imports: [CommonModule, RouterModule, SidebarComponent],
  standalone: true
})
export class InvoiceComponent implements OnInit {
  invoices: InvoiceDto[] = [];
  filteredInvoices: InvoiceDto[] = [];
  invoiceTypeFilter: string = 'all';
  currentUserEmail: string | null = null;
  apiUrl = 'https://localhost:7224/api/invoices';
  errorMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.loadInvoices();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  loadInvoices() {
    this.http.get<InvoiceDto[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.invoices = data;
        this.filterInvoices();
      },
      error: (error) => {
        this.errorMessage = `Błąd ładowania faktur: ${error.status} ${error.message}`;
      }
    });
  }

  filterInvoices() {
    if (this.invoiceTypeFilter === 'all') {
      this.filteredInvoices = this.invoices;
    } else {
      this.filteredInvoices = this.invoices.filter(i => i.invoiceType.toLowerCase() === this.invoiceTypeFilter);
    }
  }

  setFilter(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.invoiceTypeFilter = target.value;
    this.filterInvoices();
  }

  navigateTo(page: string) {
    const typeMap: { [key: string]: string } = {
      'sales-invoices': 'sales',
      'purchase-invoices': 'purchase',
      'corrective-invoices': 'corrective',
      'proforma-invoices': 'proforma',
      'advance-invoices': 'advance',
      'final-invoices': 'final'
    };
    this.setFilter({ target: { value: typeMap[page] || 'all' } } as any);
    this.router.navigate(['invoices']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['login']);
  }
}
