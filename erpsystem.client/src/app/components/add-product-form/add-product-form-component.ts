import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

interface Location {
  id: number;
  name: string;
}

interface ContractorDto {
  id: number;
  name: string;
  type: 'Supplier' | 'Client' | 'Both';
  email: string;
  phone: string;
  address: string;
  taxId: string;
  isDeleted: boolean;
}

interface CreateWarehouseItemDto {
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  contractorId: number | null;
  batchNumber: string;
  expirationDate: string | null;
  purchaseCost: number;
  vatRate: number;
}

@Component({
  selector: 'app-add-product-form',
  templateUrl: './add-product-form.component.html',
  styleUrls: ['./add-product-form.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent],
  standalone: true
})
export class AddProductFormComponent implements OnInit {
  productForm: FormGroup;
  locations: Location[] = [
    { id: 1, name: 'A1' },
    { id: 2, name: 'B2' },
    { id: 3, name: 'C3' }
  ];
  contractors: ContractorDto[] = [];
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private warehouseService: WarehouseMovementsService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      location: ['', Validators.required],
      warehouse: ['', Validators.required],
      unitOfMeasure: ['', Validators.required],
      minimumStock: [0, [Validators.required, Validators.min(0)]],
      contractorId: [null],
      batchNumber: [''],
      expirationDate: [null],
      purchaseCost: [0, [Validators.required, Validators.min(0)]],
      vatRate: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadLocations();
    this.loadContractors();
  }

  loadLocations(): void {
    this.http.get<Location[]>('https://localhost:7224/api/Warehouse/locations').subscribe({
      next: (data) => {
        this.locations = data;
        console.log('Locations loaded:', data);
      },
      error: (err: unknown) => {
        this.error = 'Błąd ładowania lokalizacji. Używanie danych domyślnych.';
        console.error('Error loading locations:', err);
      }
    });
  }

  loadContractors(): void {
    this.http.get<ContractorDto[]>('https://localhost:7224/api/Contractors').subscribe({
      next: (data) => {
        this.contractors = data;
        console.log('Contractors loaded:', data);
      },
      error: (err: unknown) => {
        this.error = 'Błąd ładowania kontrahentów.';
        console.error('Error loading contractors:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const newItem: CreateWarehouseItemDto = {
        name: this.productForm.value.name,
        code: this.productForm.value.code,
        quantity: this.productForm.value.quantity,
        price: Number(this.productForm.value.unitPrice),
        category: this.productForm.value.category,
        location: this.productForm.value.location,
        warehouse: this.productForm.value.warehouse,
        unitOfMeasure: this.productForm.value.unitOfMeasure,
        minimumStock: this.productForm.value.minimumStock,
        contractorId: this.productForm.value.contractorId,
        batchNumber: this.productForm.value.batchNumber,
        expirationDate: this.productForm.value.expirationDate,
        purchaseCost: Number(this.productForm.value.purchaseCost),
        vatRate: Number(this.productForm.value.vatRate)
      };
      this.warehouseService.addProduct(newItem).subscribe({
        next: () => this.router.navigate(['/products']),
        error: (err: unknown) => {
          this.error = 'Błąd dodawania produktu.';
          console.error('Error adding product:', err);
        }
      });
    }
  }

  navigateTo(page: string): void {
    this.router.navigate([`/${page}`]).catch(err => console.error('Navigation error:', err));
  }
}
