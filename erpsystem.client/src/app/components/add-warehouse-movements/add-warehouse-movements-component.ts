import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { WarehouseMovementType } from '../warehouse-movements/warehouse-movements.component';

@Component({
  selector: 'app-add-warehouse-movement',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, CurrencyPipe],
  templateUrl: './add-warehouse-movement.component.html',
  styleUrls: ['./add-warehouse-movement.component.css']
})
export class AddWarehouseMovementComponent implements OnInit {
  newMovement: WarehouseMovement = {
    id: 0,
    items: [],
    movementType: '',
    supplier: '',
    documentNumber: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    createdBy: '',
    status: 'Planned',
    comment: '',
    vatRate: 0.23,
    discount: 0
  };
  selectedProduct: MovementItem = {
    warehouseItemId: 0,
    productName: '',
    productCode: '',
    unitPrice: 0,
    quantity: 0
  };
  selectedContractor: ContractorDTO | null = null;
  products: Product[] = [];
  contractors: ContractorDTO[] = [];
  currentUserFullName: string = 'Unknown';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private movementService: WarehouseMovementsService
  ) { }

  ngOnInit() {
    this.loadProducts();
    this.loadContractors();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
    this.newMovement.documentNumber = this.generateDocumentNumber();
    this.newMovement.createdBy = this.currentUserFullName;
  }

  loadProducts() {
    this.http.get<Product[]>('https://localhost:7224/api/Warehouse').subscribe({
      next: (data: Product[]) => {
        this.products = data;
        if (this.products.length === 0) {
          this.errorMessage = 'Brak produktów w bazie danych.';
        }
      },
      error: (error: any) => {
        this.errorMessage = `Błąd ładowania produktów: ${error.status} - ${error.statusText || 'Nieznany błąd'}`;
      }
    });
  }

  loadContractors() {
    this.http.get<ContractorDTO[]>('https://localhost:7224/api/Contractors').subscribe({
      next: (data: ContractorDTO[]) => {
        this.contractors = data;
        if (this.contractors.length === 0) {
          this.errorMessage = 'Brak kontrahentów w bazie danych.';
        }
      },
      error: (error: any) => {
        this.errorMessage = `Błąd ładowania kontrahentów: ${error.status} - ${error.statusText || 'Nieznany błąd'}`;
      }
    });
  }

  onSupplierChange() {
    this.selectedContractor = this.contractors.find(c => c.name === this.newMovement.supplier) || null;
  }

  onProductChange() {
    const selectedId = Number(this.selectedProduct.warehouseItemId);
    const product = this.products.find(p => p.id === selectedId);
    if (product) {
      this.selectedProduct.productName = product.name;
      this.selectedProduct.productCode = product.code;
      this.selectedProduct.unitPrice = product.unitPrice;
    } else {
      this.selectedProduct.productName = '';
      this.selectedProduct.productCode = '';
      this.selectedProduct.unitPrice = 0;
    }
  }

  addProductToList() {
    if (this.selectedProduct.warehouseItemId && this.selectedProduct.quantity > 0) {
      this.newMovement.items.push({ ...this.selectedProduct });
      this.selectedProduct = {
        warehouseItemId: 0,
        productName: '',
        productCode: '',
        unitPrice: 0,
        quantity: 0
      };
      this.successMessage = 'Produkt dodano do listy.';
    } else {
      this.errorMessage = 'Wybierz produkt i podaj ilość.';
    }
  }

  removeProduct(index: number) {
    this.newMovement.items.splice(index, 1);
  }

  calculateNetTotal(): number {
    return this.newMovement.items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  }

  calculateVatAmount(): number {
    const netTotal = this.calculateNetTotal();
    return netTotal * this.newMovement.vatRate;
  }

  calculateGrossTotal(): number {
    const netTotal = this.calculateNetTotal();
    const discountAmount = netTotal * (this.newMovement.discount / 100);
    const discountedNet = netTotal - discountAmount;
    const vatAmount = discountedNet * this.newMovement.vatRate;
    return discountedNet + vatAmount;
  }

  generateDocumentNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `DOC/${datePart}/${randomNum}`;
  }

  addMovement() {
    if (this.newMovement.items.length === 0) {
      this.errorMessage = 'Dodaj przynajmniej jeden produkt.';
      return;
    }
    if (!this.newMovement.movementType) {
      this.errorMessage = 'Wybierz typ ruchu magazynowego.';
      return;
    }
    if (!this.newMovement.supplier) {
      this.errorMessage = 'Wybierz dostawcę.';
      return;
    }

    const movements = this.newMovement.items.map(item => ({
      warehouseItemId: item.warehouseItemId,
      movementType: this.mapMovementTypeForApi(this.newMovement.movementType),
      quantity: item.quantity,
      supplier: this.newMovement.supplier,
      documentNumber: this.newMovement.documentNumber,
      date: this.formatDateForApi(this.newMovement.date),
      description: this.newMovement.description || '',
      createdBy: this.currentUserFullName || 'Unknown',
      status: this.mapStatusForApi(this.newMovement.status),
      comment: this.newMovement.comment || '',
      vatRate: this.newMovement.vatRate,
      discount: this.newMovement.discount
    }));

    const movementObservables = movements.map(movement =>
      this.movementService.createMovement(movement)
    );

    Promise.all(movementObservables.map(obs => obs.toPromise()))
      .then(() => {
        this.successMessage = 'Ruch magazynowy dodano pomyślnie.';
        setTimeout(() => {
          this.router.navigate(['/movements']);
        }, 2000);
      })
      .catch(error => {
        this.errorMessage = error.error?.message || `Błąd podczas dodawania ruchu: ${error.status} - ${error.statusText || 'Nieznany błąd'}`;
      });
  }

  cancel() {
    this.router.navigate(['/movements']);
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  mapMovementTypeForApi(movementType: string): string {
    switch (movementType) {
      case 'Przyjęcie Zewnętrzne': return WarehouseMovementType.PZ;
      case 'Przyjęcie Wewnętrzne': return WarehouseMovementType.PW;
      case 'Wydanie Zewnętrzne': return WarehouseMovementType.WZ;
      case 'Rozchód Wewnętrzny': return WarehouseMovementType.RW;
      case 'Przesunięcie Międzymagazynowe': return WarehouseMovementType.MM;
      case 'Zwrot Wewnętrzny': return WarehouseMovementType.ZW;
      case 'Zwrot Konsygnacyjny': return WarehouseMovementType.ZK;
      case 'Inwentaryzacja': return WarehouseMovementType.INW;
      default: return '';
    }
  }

  mapStatusForApi(status: string): string {
    switch (status) {
      case 'Zaplanowane': return 'Planned';
      case 'W trakcie': return 'InProgress';
      case 'Zakończone': return 'Completed';
      default: return 'Planned';
    }
  }

  formatDateForApi(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString();
  }
}

interface WarehouseMovement {
  id: number;
  items: MovementItem[];
  movementType: string;
  supplier: string;
  documentNumber: string;
  description: string;
  date: string;
  createdBy: string;
  status: string;
  comment?: string;
  vatRate: number;
  discount: number;
}

interface MovementItem {
  warehouseItemId: number;
  productName: string;
  productCode: string;
  unitPrice: number;
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  category: string;
  location: string;
}

interface ContractorDTO {
  id: number;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  isDeleted: boolean;
}

interface WarehouseMovementDTO {
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  date: string;
  description: string;
  createdBy: string;
  status: string;
  comment: string;
  vatRate?: number;
  discount?: number;
}
