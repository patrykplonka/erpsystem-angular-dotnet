import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  isWarehouseOpen = false;
  isInvoicesOpen = false;
  @Input() isLoading: boolean = false;

  @Output() navigate = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();

  toggleWarehouseMenu() {
    this.isWarehouseOpen = !this.isWarehouseOpen;
  }

  toggleInvoicesMenu() {
    this.isInvoicesOpen = !this.isInvoicesOpen;
  }

  goToProducts() {
    this.navigate.emit('products');
  }

  goToMovements() {
    this.navigate.emit('movements');
  }

  goToReports() {
    this.navigate.emit('reports');
  }

  goToContractors() {
    this.navigate.emit('contractors');
  }

  goToOrders() {
    this.navigate.emit('orders');
  }

  goToSalesInvoices() {
    this.navigate.emit('sales-invoices');
  }

  goToPurchaseInvoices() {
    this.navigate.emit('purchase-invoices');
  }

  goToCorrectiveInvoices() {
    this.navigate.emit('corrective-invoices');
  }

  goToProFormaInvoices() {
    this.navigate.emit('proforma-invoices');
  }

  goToAdvanceInvoices() {
    this.navigate.emit('advance-invoices');
  }

  goToFinalInvoices() {
    this.navigate.emit('final-invoices');
  }

  logout() {
    this.logoutEvent.emit();
  }
}
