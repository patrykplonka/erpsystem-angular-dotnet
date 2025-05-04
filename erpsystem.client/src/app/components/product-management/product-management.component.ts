import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  category: string;
  location: string;
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  contractorId: number | null;
  contractorName: string;
  batchNumber: string;
  expirationDate: string | null;
  purchaseCost: number;
  vatRate: number;
  isDeleted?: boolean;
}

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css'],
  imports: [CommonModule, FormsModule, SidebarComponent],
  standalone: true
})
export class ProductManagementComponent implements OnInit {
  items: WarehouseItemDto[] = [];
  filteredItems: WarehouseItemDto[] = [];
  editItem: WarehouseItemDto | null = null;
  searchTerm: string = '';
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('ProductManagementComponent initialized');
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.error = null;
    console.log('Fetching products from https://localhost:7224/api/Warehouse');
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/Warehouse').subscribe({
      next: (data) => {
        console.log('Products loaded:', data);
        this.items = data;
        this.filteredItems = data;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.error = 'Błąd ładowania produktów. Sprawdź konsolę.';
        console.error('Error loading products:', err);
        this.loading = false;
      }
    });
  }

  filterItems(): void {
    this.filteredItems = this.items.filter(item =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  editProduct(item: WarehouseItemDto): void {
    this.editItem = { ...item };
  }

  saveEdit(): void {
    if (this.editItem) {
      this.http.put(`https://localhost:7224/api/Warehouse/${this.editItem.id}`, this.editItem).subscribe({
        next: () => {
          this.loadItems();
          this.editItem = null;
        },
        error: (err: unknown) => console.error('Error updating item:', err)
      });
    }
  }

  cancelEdit(): void {
    this.editItem = null;
  }

  deleteProduct(id: number): void {
    this.http.delete(`https://localhost:7224/api/Warehouse/${id}`).subscribe({
      next: () => this.loadItems(),
      error: (err: unknown) => console.error('Error deleting item:', err)
    });
  }

  navigateTo(page: string): void {
    console.log('Navigating to:', page);
    this.router.navigate([`/${page}`]).catch(err => console.error('Navigation error:', err));
  }
}
