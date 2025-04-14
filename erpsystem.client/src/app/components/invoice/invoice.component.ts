import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { saveAs } from 'file-saver';

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
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css']
})
export class InvoiceComponent implements OnInit {
  invoices: InvoiceDto[] = [];
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  invoiceSortField: string = '';
  invoiceSortDirection: 'asc' | 'desc' = 'asc';
  invoiceStatusFilter: string = '';
  invoiceStartDateFilter: string = '';
  invoiceEndDateFilter: string = '';
  invoiceUserFilter: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadInvoices();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
  }

  loadInvoices() {
    this.http.get<InvoiceDto[]>('https://localhost:7224/api/orders/invoices', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).subscribe({
      next: (data) => {
        this.invoices = data.map(invoice => ({
          ...invoice,
          issueDate: this.formatDate(invoice.issueDate),
          dueDate: this.formatDate(invoice.dueDate),
          status: this.mapStatusFromApi(invoice.status)
        }));
      },
      error: (error) => {
        this.errorMessage = `Błąd ładowania faktur: ${error.status} ${error.message}`;
      }
    });
  }

  downloadInvoice(invoice: InvoiceDto) {
    this.http.get(`https://localhost:7224/api/orders/invoices/download/${invoice.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        saveAs(blob, `Invoice_${invoice.invoiceNumber}.pdf`);
        this.successMessage = `Faktura ${invoice.invoiceNumber} została pobrana.`;
      },
      error: (error) => {
        this.errorMessage = `Błąd podczas pobierania faktury: ${error.status} ${error.message}`;
      }
    });
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

  mapStatusFromApi(status: string): string {
    switch (status) {
      case 'Draft':
        return 'Szkic';
      case 'Issued':
        return 'Wystawiona';
      case 'Paid':
        return 'Zapłacona';
      case 'Overdue':
        return 'Zaległa';
      default:
        return status;
    }
  }

  applyFilters() {
  }

  get filteredInvoices(): InvoiceDto[] {
    let filtered = this.invoices.filter(i => {
      const matchesStatus = !this.invoiceStatusFilter ||
        i.status.toLowerCase().includes(this.invoiceStatusFilter.toLowerCase());
      const matchesStartDate = !this.invoiceStartDateFilter ||
        new Date(i.issueDate).getTime() >= new Date(this.invoiceStartDateFilter).getTime();
      const matchesEndDate = !this.invoiceEndDateFilter ||
        new Date(i.issueDate).getTime() <= new Date(this.invoiceEndDateFilter).getTime();
      const matchesUser = !this.invoiceUserFilter ||
        i.createdBy.toLowerCase().includes(this.invoiceUserFilter.toLowerCase());
      return matchesStatus && matchesStartDate && matchesEndDate && matchesUser;
    });

    if (this.invoiceSortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.invoiceSortField as keyof InvoiceDto];
        const valueB = b[this.invoiceSortField as keyof InvoiceDto];
        if (this.invoiceSortField === 'issueDate' || this.invoiceSortField === 'dueDate') {
          return this.invoiceSortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.invoiceSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.invoiceSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }

    return filtered;
  }

  sortInvoices(field: string) {
    if (this.invoiceSortField === field) {
      this.invoiceSortDirection = this.invoiceSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.invoiceSortField = field;
      this.invoiceSortDirection = 'asc';
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
}
