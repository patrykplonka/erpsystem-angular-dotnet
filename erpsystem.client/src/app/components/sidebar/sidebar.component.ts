import { Component, Output, EventEmitter } from '@angular/core';
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

  @Output() navigate = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();

  toggleWarehouseMenu() {
    this.isWarehouseOpen = !this.isWarehouseOpen;
  }

  goToProducts() {
    this.navigate.emit('/products');
  }

  goToMovements() {
    this.navigate.emit('/movements');
  }

  goToReports() {
    this.navigate.emit('/reports');
  }

  goToContractors() {
    this.navigate.emit('/contractors');
  }

  logout() {
    this.logoutEvent.emit();
  }
}
