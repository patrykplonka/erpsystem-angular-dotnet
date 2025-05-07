import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-contractors',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './contractors.component.html',
  styleUrls: ['./contractors.component.css']
})
export class ContractorsComponent implements OnInit {
  contractors: ContractorDto[] = [];
  deletedContractors: ContractorDto[] = [];
  editContractor: UpdateContractorDto | null = null;
  selectedContractor: ContractorDto | null = null;
  contractorToDelete: number | null = null;
  currentUserEmail: string | null = null;
  showDeleted: boolean = false;
  nameFilter: string = '';
  typeFilter: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  contractorTypes: { display: string, value: string }[] = [
    { display: 'Dostawca', value: 'Supplier' },
    { display: 'Klient', value: 'Client' },
    { display: 'Oba', value: 'Both' }
  ];
  sortColumn: keyof ContractorDto | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 10;
  currentPage = 1;

  private apiUrl = 'https://localhost:7224/api/contractors';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadContractors();
    this.currentUserEmail = this.authService.getCurrentUserEmail();
  }

  loadContractors() {
    this.http.get<ContractorDto[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.contractors = data.filter(c => !c.isDeleted);
        this.deletedContractors = data.filter(c => c.isDeleted);
      },
      error: (error) => this.errorMessage = `Błąd ładowania kontrahentów: ${error.status} ${error.message}`
    });
  }

  getTypeDisplay(type: string): string {
    const typeObj = this.contractorTypes.find(t => t.value === type);
    return typeObj ? typeObj.display : type;
  }

  applyFilters() {
    let filtered = this.showDeleted ? [...this.deletedContractors] : [...this.contractors];
    filtered = filtered.filter(c => {
      const matchesName = !this.nameFilter || c.name.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesType = !this.typeFilter || c.type === this.typeFilter;
      return matchesName && matchesType;
    });
    if (this.sortColumn) {
      filtered.sort((a, b) => {
        const valueA = a[this.sortColumn!];
        const valueB = b[this.sortColumn!];
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return this.sortDirection === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }
        return this.sortDirection === 'asc'
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      });
    }
    return filtered;
  }

  get filteredContractors(): ContractorDto[] {
    const filtered = this.applyFilters();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.applyFilters().length / this.pageSize);
  }

  sortTable(column: keyof ContractorDto) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  startEdit(contractor: ContractorDto) {
    this.editContractor = { ...contractor };
  }

  updateContractor() {
    if (!this.editContractor || !this.editContractor.name || !this.editContractor.type || !this.editContractor.email || !this.editContractor.taxId) {
      this.errorMessage = 'Nazwa, typ, email i NIP są wymagane.';
      return;
    }
    if (!this.isValidNip(this.editContractor.taxId)) {
      this.errorMessage = 'Podany NIP jest nieprawidłowy.';
      return;
    }
    this.http.put(`${this.apiUrl}/${this.editContractor.id}`, this.editContractor).subscribe({
      next: () => {
        this.successMessage = `Zaktualizowano kontrahenta: ${this.editContractor!.name}`;
        this.errorMessage = null;
        this.loadContractors();
        this.editContractor = null;
      },
      error: (error) => this.errorMessage = `Błąd aktualizacji kontrahenta: ${error.status} ${error.message}`
    });
  }

  confirmDelete(id: number) {
    this.contractorToDelete = id;
  }

  cancelDelete() {
    this.contractorToDelete = null;
  }

  deleteContractor(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.successMessage = 'Kontrahent usunięty.';
        this.errorMessage = null;
        this.loadContractors();
        this.contractorToDelete = null;
      },
      error: (error) => this.errorMessage = `Błąd usuwania kontrahenta: ${error.status} ${error.message}`
    });
  }

  restoreContractor(id: number) {
    this.http.post(`${this.apiUrl}/restore/${id}`, {}).subscribe({
      next: () => {
        this.successMessage = 'Kontrahent przywrócony.';
        this.errorMessage = null;
        this.loadContractors();
      },
      error: (error) => this.errorMessage = `Błąd przywracania kontrahenta: ${error.status} ${error.message}`
    });
  }

  exportToCsv() {
    const headers = ['ID,Nazwa,Typ,Email,Telefon,Adres,NIP,Usunięty\n'];
    const rows = this.applyFilters().map(c =>
      `${c.id},${c.name},${c.type},${c.email},${c.phone || ''},${c.address || ''},${c.taxId},${c.isDeleted ? 'Tak' : 'Nie'}`
    );
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kontrahenci_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  importFromCsv(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      const contractors: CreateContractorDto[] = [];

      for (let i = 1; i < lines.length; i++) {
        const [name, type, email, phone, address, taxId] = lines[i].split(',').map(val => val.trim());
        if (name && type && email && taxId) {
          contractors.push({
            name,
            type: type as 'Supplier' | 'Client' | 'Both',
            email,
            phone: phone || '',
            address: address || '',
            taxId
          });
        }
      }

      if (contractors.length === 0) {
        this.errorMessage = 'Brak poprawnych danych w pliku CSV.';
        return;
      }

      this.http.post(`${this.apiUrl}/import`, contractors).subscribe({
        next: (response: any) => {
          this.successMessage = response.message;
          this.errorMessage = null;
          this.loadContractors();
          input.value = '';
        },
        error: (error) => {
          this.errorMessage = error.error.message || 'Błąd importu kontrahentów.';
          if (error.error.errors) {
            this.errorMessage += ' ' + error.error.errors.join(' ');
          }
        }
      });
    };
    reader.readAsText(file);
  }

  showDetails(contractor: ContractorDto) {
    this.selectedContractor = contractor;
  }

  closeDetails() {
    this.selectedContractor = null;
  }

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    this.currentPage = 1;
  }

  cancelEdit() {
    this.editContractor = null;
  }

  isValidNip(nip: string): boolean {
    nip = nip.replace(/[\s-]/g, '');
    if (nip.length !== 10 || !/^\d{10}$/.test(nip)) return false;
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(nip[i]) * weights[i];
    }
    const checksum = sum % 11;
    return checksum === parseInt(nip[9]);
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
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

interface CreateContractorDto {
  name: string;
  type: 'Supplier' | 'Client' | 'Both';
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

interface UpdateContractorDto {
  id: number;
  name: string;
  type: 'Supplier' | 'Client' | 'Both';
  email: string;
  phone: string;
  address: string;
  taxId: string;
  isDeleted: boolean;
}
