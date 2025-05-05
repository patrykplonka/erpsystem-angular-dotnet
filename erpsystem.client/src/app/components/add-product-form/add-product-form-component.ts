import { Component, OnInit, Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Pipe({
  name: 'percent',
  standalone: true
})
export class PercentPipe implements PipeTransform {
  transform(value: number | null): string {
    return value !== null ? `${value}%` : '';
  }
}

interface Location {
  id: number;
  name: string;
  type: string;
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, PercentPipe],
  standalone: true
})
export class AddProductFormComponent implements OnInit {
  productForm: FormGroup;
  locations: Location[] = [
    { id: 1, name: 'A1', type: 'Location' },
    { id: 2, name: 'B2', type: 'Location' },
    { id: 3, name: 'C3', type: 'Location' },
    { id: 4, name: 'Main Warehouse', type: 'Warehouse' },
    { id: 5, name: 'Secondary Warehouse', type: 'Warehouse' }
  ];
  contractors: ContractorDto[] = [];
  error: string | null = null;
  categories: string[] = ['Elektronika', 'Spożywcze', 'Chemia', 'Inne'];
  unitsOfMeasure: string[] = ['szt', 'kg', 'l', 'm'];
  showNewCategoryInput: boolean = false;
  nextCodeNumber: number;
  nextBatchNumber: number;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private warehouseService: WarehouseMovementsService
  ) {
    // Load counters from localStorage or default to 1
    this.nextCodeNumber = parseInt(localStorage.getItem('nextCodeNumber') || '1', 10);
    this.nextBatchNumber = parseInt(localStorage.getItem('nextBatchNumber') || '1', 10);
    console.log('Constructor: Loaded code number:', this.nextCodeNumber, 'batch number:', this.nextBatchNumber);

    this.productForm = this.fb.group({
      name: ['', Validators.required],
      code: [{ value: this.formatCode(this.nextCodeNumber), disabled: true }, Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      newCategory: [''],
      location: ['', Validators.required],
      warehouse: ['', Validators.required],
      unitOfMeasure: ['', Validators.required],
      minimumStock: [0, [Validators.required, Validators.min(0)]],
      contractorId: [null],
      batchNumber: [{ value: this.formatBatchNumber(this.nextBatchNumber), disabled: true }],
      purchaseCost: [0, [Validators.required, Validators.min(0)]],
      vatRate: [{ value: 23, disabled: true }, [Validators.required, Validators.min(0)]]
    });

    // Watch for category changes to toggle new category input
    this.productForm.get('category')?.valueChanges.subscribe(value => {
      this.showNewCategoryInput = value === 'Inna';
    });
  }

  ngOnInit(): void {
    console.log('ngOnInit: Initial code number:', this.nextCodeNumber, 'batch number:', this.nextBatchNumber);
    this.loadLocations();
    this.loadContractors();
    this.loadLastCodeAndBatchNumber();
  }

  loadLocations(): void {
    this.http.get<Location[]>('https://localhost:7224/api/Warehouse/locations').subscribe({
      next: (data) => {
        this.locations = data;
        console.log('Locations and warehouses loaded:', data);
      },
      error: (err: unknown) => {
        this.error = 'Błąd ładowania lokalizacji i magazynów. Używanie danych domyślnych.';
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

  loadLastCodeAndBatchNumber(): void {
    // Fetch last code
    this.http.get<{ code: string }>('https://localhost:7224/api/Warehouse/last-code').subscribe({
      next: (data) => {
        const fetchedCodeNumber = this.parseCodeNumber(data.code) + 1;
        this.nextCodeNumber = Math.max(fetchedCodeNumber, this.nextCodeNumber);
        localStorage.setItem('nextCodeNumber', this.nextCodeNumber.toString());
        console.log('Fetched last code:', data.code, 'Set next code number:', this.nextCodeNumber);
        this.productForm.get('code')?.setValue(this.formatCode(this.nextCodeNumber), { emitEvent: false });
      },
      error: (err: unknown) => {
        console.error('Error loading last code, using local counter:', this.nextCodeNumber, err);
        this.productForm.get('code')?.setValue(this.formatCode(this.nextCodeNumber), { emitEvent: false });
      }
    });

    // Fetch last batch number
    this.http.get<{ batchNumber: string }>('https://localhost:7224/api/Warehouse/last-batch-number').subscribe({
      next: (data) => {
        const fetchedBatchNumber = this.parseBatchNumber(data.batchNumber) + 1;
        this.nextBatchNumber = Math.max(fetchedBatchNumber, this.nextBatchNumber);
        localStorage.setItem('nextBatchNumber', this.nextBatchNumber.toString());
        console.log('Fetched last batch number:', data.batchNumber, 'Set next batch number:', this.nextBatchNumber);
        this.productForm.get('batchNumber')?.setValue(this.formatBatchNumber(this.nextBatchNumber), { emitEvent: false });
      },
      error: (err: unknown) => {
        console.error('Error loading last batch number, using local counter:', this.nextBatchNumber, err);
        this.productForm.get('batchNumber')?.setValue(this.formatBatchNumber(this.nextBatchNumber), { emitEvent: false });
      }
    });
  }

  parseCodeNumber(code: string | null): number {
    if (!code || !code.startsWith('P')) return 0;
    const numberPart = parseInt(code.replace('P', ''), 10);
    return isNaN(numberPart) ? 0 : numberPart;
  }

  parseBatchNumber(batchNumber: string | null): number {
    if (!batchNumber || !batchNumber.startsWith('B')) return 0;
    const numberPart = parseInt(batchNumber.replace('B', ''), 10);
    return isNaN(numberPart) ? 0 : numberPart;
  }

  formatCode(number: number): string {
    return `P${number.toString().padStart(4, '0')}`;
  }

  formatBatchNumber(number: number): string {
    return `B${number.toString().padStart(4, '0')}`;
  }

  onNewCategoryChange(): void {
    const newCategory = this.productForm.get('newCategory')?.value;
    if (newCategory && !this.categories.includes(newCategory)) {
      this.categories.push(newCategory);
      this.productForm.patchValue({ category: newCategory, newCategory: '' });
      this.showNewCategoryInput = false;
    }
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const newItem: CreateWarehouseItemDto = {
        name: this.productForm.value.name,
        code: this.productForm.get('code')?.value,
        quantity: this.productForm.value.quantity,
        price: Number(this.productForm.value.unitPrice),
        category: this.productForm.value.category,
        location: this.productForm.value.location,
        warehouse: this.productForm.value.warehouse,
        unitOfMeasure: this.productForm.value.unitOfMeasure,
        minimumStock: this.productForm.value.minimumStock,
        contractorId: this.productForm.value.contractorId,
        batchNumber: this.productForm.get('batchNumber')?.value,
        expirationDate: null, // Explicitly set to null to match backend
        purchaseCost: Number(this.productForm.value.purchaseCost),
        vatRate: Number(this.productForm.get('vatRate')?.value) // Ensure numeric value (23)
      };
      console.log('Submitting item:', newItem);
      this.warehouseService.addProduct(newItem).subscribe({
        next: () => {
          console.log('Product added. Current code number:', this.nextCodeNumber, 'batch number:', this.nextBatchNumber);
          // Increment counters
          this.nextCodeNumber++;
          this.nextBatchNumber++;
          // Save to localStorage
          localStorage.setItem('nextCodeNumber', this.nextCodeNumber.toString());
          localStorage.setItem('nextBatchNumber', this.nextBatchNumber.toString());
          console.log('Incremented to code number:', this.nextCodeNumber, 'batch number:', this.nextBatchNumber);
          // Update form controls
          this.productForm.get('code')?.setValue(this.formatCode(this.nextCodeNumber), { emitEvent: false });
          this.productForm.get('batchNumber')?.setValue(this.formatBatchNumber(this.nextBatchNumber), { emitEvent: false });
          // Reset other fields
          this.productForm.patchValue({
            name: '',
            quantity: 0,
            unitPrice: 0,
            category: '',
            newCategory: '',
            location: '',
            warehouse: '',
            unitOfMeasure: '',
            minimumStock: 0,
            contractorId: null,
            purchaseCost: 0
          });
          console.log('Form after update:', {
            code: this.productForm.get('code')?.value,
            batchNumber: this.productForm.get('batchNumber')?.value,
            formValid: this.productForm.valid,
            formValue: this.productForm.value
          });
          // Temporarily disable navigation to verify incrementing
          // this.router.navigate(['/products']);
        },
        error: (err: any) => {
          const errorMessage = err.error || 'Błąd dodawania produktu.';
          this.error = errorMessage;
          console.error('Error adding product:', err);
          // If duplicate code error, try next code
          if (errorMessage.includes('Produkt o podanym kodzie już istnieje')) {
            this.nextCodeNumber++;
            this.nextBatchNumber++;
            localStorage.setItem('nextCodeNumber', this.nextCodeNumber.toString());
            localStorage.setItem('nextBatchNumber', this.nextBatchNumber.toString());
            this.productForm.get('code')?.setValue(this.formatCode(this.nextCodeNumber), { emitEvent: false });
            this.productForm.get('batchNumber')?.setValue(this.formatBatchNumber(this.nextBatchNumber), { emitEvent: false });
            console.log('Duplicate code detected, incremented to:', this.nextCodeNumber, this.nextBatchNumber);
          }
        }
      });
    } else {
      console.log('Form invalid:', this.productForm.errors, 'Form values:', this.productForm.value);
    }
  }

  navigateTo(page: string): void {
    this.router.navigate([`/${page}`]).catch(err => console.error('Navigation error:', err));
  }

  getLocationsByType(type: string): Location[] {
    return this.locations.filter(loc => loc.type === type);
  }
}
