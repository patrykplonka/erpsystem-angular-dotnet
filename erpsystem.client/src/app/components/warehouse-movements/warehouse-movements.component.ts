import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarehouseMovementsService } from '../../services/warehouse-movements.service';

@Component({
  selector: 'app-warehouse-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-movements.component.html',
  styleUrls: ['./warehouse-movements.component.css']
})
export class WarehouseMovementsComponent implements OnInit {
  warehouseItems: WarehouseItemDto[] = [];
  movements: WarehouseMovement[] = [];
  newMovement: CreateWarehouseMovementDto = {
    warehouseItemId: 0,
    movementType: 'Przyjęcie zewnętrzne',
    quantity: 0,
    supplier: '',
    documentNumber: '',
    description: '',
    status: 'Zakończone',
    createdBy: '',
    date: '',
    comment: ''
  };
  currentUserEmail: string | null = null;
  currentUserFullName: string = 'Unknown';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  selectedItemId: number | null = null;
  showMovements: boolean = false;
  movementSortField: string = '';
  movementSortDirection: 'asc' | 'desc' = 'asc';
  movementTypeFilter: string = '';
  movementStatusFilter: string = '';
  movementMinQuantityFilter: number | null = null;
  movementMaxQuantityFilter: number | null = null;
  movementStartDateFilter: string = '';
  movementEndDateFilter: string = '';
  movementUserFilter: string = '';
  isWarehouseOpen: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private movementService: WarehouseMovementsService
  ) { }

  ngOnInit() {
    this.loadItems();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
    this.currentUserFullName = this.authService.getCurrentUserFullName();
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

  formatDateForApi(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString();
  }

  loadItems() {
    this.http.get<WarehouseItemDto[]>('https://localhost:7224/api/warehouse').subscribe(
      data => {
        this.warehouseItems = data;
      },
      error => this.errorMessage = `Błąd ładowania produktów: ${error.status} ${error.message}`
    );
  }

  applyFilters() {
  }

  get filteredMovements(): WarehouseMovement[] {
    let filtered = this.movements.filter(m => {
      const matchesType = !this.movementTypeFilter ||
        m.movementType.toLowerCase().includes(this.movementTypeFilter.toLowerCase());
      const matchesStatus = !this.movementStatusFilter ||
        m.status.toLowerCase().includes(this.movementStatusFilter.toLowerCase());
      const matchesMinQuantity = this.movementMinQuantityFilter === null || m.quantity >= this.movementMinQuantityFilter;
      const matchesMaxQuantity = this.movementMaxQuantityFilter === null || m.quantity <= this.movementMaxQuantityFilter;
      const matchesStartDate = !this.movementStartDateFilter ||
        new Date(m.date).getTime() >= new Date(this.movementStartDateFilter).getTime();
      const matchesEndDate = !this.movementEndDateFilter ||
        new Date(m.date).getTime() <= new Date(this.movementEndDateFilter).getTime();
      const matchesUser = !this.movementUserFilter ||
        m.createdBy.toLowerCase().includes(this.movementUserFilter.toLowerCase());
      return matchesType && matchesStatus && matchesMinQuantity && matchesMaxQuantity && matchesStartDate && matchesEndDate && matchesUser;
    });

    if (this.movementSortField) {
      filtered.sort((a, b) => {
        const valueA = a[this.movementSortField as keyof WarehouseMovement];
        const valueB = b[this.movementSortField as keyof WarehouseMovement];
        if (this.movementSortField === 'date') {
          return this.movementSortDirection === 'asc'
            ? new Date(valueA as string).getTime() - new Date(valueB as string).getTime()
            : new Date(valueB as string).getTime() - new Date(valueA as string).getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.movementSortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          return this.movementSortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }

    return filtered;
  }

  toggleMovements(itemId: number) {
    if (this.selectedItemId === itemId && this.showMovements) {
      this.showMovements = false;
      this.selectedItemId = null;
    } else {
      this.selectedItemId = itemId;
      this.showMovements = true;
      this.loadMovements(itemId);
      this.newMovement.warehouseItemId = itemId;
      this.newMovement.createdBy = this.currentUserFullName;
    }
  }

  loadMovements(itemId: number) {
    this.movementService.getMovementsByItem(itemId).subscribe(
      data => {
        this.movements = data.map(movement => ({
          ...movement,
          date: this.formatDate(movement.date)
        }));
      },
      error => this.errorMessage = `Błąd ładowania ruchów: ${error.status} ${error.message}`
    );
  }

  addMovement() {
    if (this.newMovement.quantity <= 0) {
      this.errorMessage = 'Ilość musi być większa niż 0.';
      return;
    }
    if (!this.newMovement.movementType || !this.newMovement.status) {
      this.errorMessage = 'Typ ruchu i status są wymagane.';
      return;
    }
    this.newMovement.date = this.formatDateForApi(new Date());
    this.newMovement.createdBy = this.currentUserFullName;
    this.newMovement.comment = this.newMovement.comment !== undefined ? this.newMovement.comment : '';
    this.movementService.createMovement(this.newMovement).subscribe(
      () => {
        this.successMessage = 'Ruch magazynowy dodany.';
        this.errorMessage = null;
        this.loadMovements(this.newMovement.warehouseItemId);
        this.loadItems();
        this.newMovement = {
          warehouseItemId: this.newMovement.warehouseItemId,
          movementType: 'Przyjęcie zewnętrzne',
          quantity: 0,
          supplier: '',
          documentNumber: '',
          description: '',
          status: 'Zakończone',
          createdBy: this.currentUserFullName,
          date: '',
          comment: ''
        };
      },
      error => {
        if (error.status === 400 && error.error === 'Niewystarczająca ilość na magazynie') {
          this.errorMessage = `Niewystarczająca ilość na magazynie dla produktu ID ${this.newMovement.warehouseItemId}.`;
        } else {
          this.errorMessage = error.error || `Błąd dodawania ruchu: ${error.status} ${error.message}`;
        }
      }
    );
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const text = e.target.result as string;
        const data = this.parseCSV(text);
        this.processBulkMovements(data);
      };
      reader.readAsText(file);
    }
  }

  parseCSV(csv: string): any[] {
    const lines = csv.split('\n');
    const result: any[] = [];
    const headers = lines[0].split(',').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"(.+)"$/, '$1'));
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        result.push(obj);
      }
    }
    return result;
  }

  processBulkMovements(data: any[]) {
    const movements = data.map(row => {
      let movementType = row.movementType;
      if (movementType === 'Receipt') movementType = 'Przyjęcie zewnętrzne';
      if (movementType === 'Issue') movementType = 'Wydanie';
      if (movementType === 'Production') movementType = 'Produkcja';
      let status = row.status || 'Zakończone';
      if (status === 'Planned') status = 'Zaplanowane';
      if (status === 'InProgress') status = 'W trakcie';
      if (status === 'Completed') status = 'Zakończone';
      return {
        warehouseItemId: parseInt(row.warehouseItemId, 10),
        movementType: movementType,
        quantity: parseInt(row.quantity, 10),
        supplier: row.supplier || '',
        documentNumber: row.documentNumber || '',
        description: row.description || '',
        createdBy: this.currentUserFullName,
        status: status,
        comment: row.comment || '',
        date: this.formatDateForApi(new Date())
      };
    });
    movements.forEach(movement => {
      this.movementService.createMovement(movement).subscribe(
        () => {
          this.loadMovements(movement.warehouseItemId);
          this.loadItems();
        },
        error => {
          if (error.status === 400 && error.error === 'Niewystarczająca ilość na magazynie') {
            this.errorMessage = `Błąd dla produktu ID ${movement.warehouseItemId}: Niewystarczająca ilość na magazynie.`;
          } else {
            this.errorMessage = `Błąd podczas masowego dodawania: ${error.status} - ${error.statusText}. Szczegóły: ${error.error || 'Brak szczegółów'}`;
          }
        }
      );
    });
    this.successMessage = 'Masowe dodawanie ruchów zakończone.';
  }

  sortMovements(field: string) {
    if (this.movementSortField === field) {
      this.movementSortDirection = this.movementSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.movementSortField = field;
      this.movementSortDirection = 'asc';
    }
    this.applyFilters();
  }

  toggleWarehouseMenu() {
    this.isWarehouseOpen = !this.isWarehouseOpen;
  }

  goToProducts() {
    this.router.navigate(['/products']);
  }

  goToMovements() {
    this.router.navigate(['/movements']);
  }

  goToReports() {
    this.router.navigate(['/reports']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

interface WarehouseItemDto {
  id: number;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category: string;
  location: string;
}

interface WarehouseMovement {
  id: number;
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  date: string;
  createdBy: string;
  status: 'Zaplanowane' | 'W trakcie' | 'Zakończone';
  comment?: string;
}

interface CreateWarehouseMovementDto {
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  description: string;
  status: 'Zaplanowane' | 'W trakcie' | 'Zakończone';
  createdBy: string;
  date: string;
  comment?: string;
}
