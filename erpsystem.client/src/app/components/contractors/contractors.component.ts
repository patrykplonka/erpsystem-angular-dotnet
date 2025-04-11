import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service'; // Dostosuj ścieżkę
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component'; // Dostosuj ścieżkę

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
  newContractor: CreateContractorDto = { name: '', type: 'Supplier', email: '', phone: '', address: '', taxId: '' };
  editContractor: UpdateContractorDto | null = null;
  currentUserEmail: string | null = null;
  showDeleted: boolean = false;
  showAddForm: boolean = false;
  nameFilter: string = '';
  typeFilter: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  contractorTypes: string[] = ['Supplier', 'Client', 'Both'];

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

  applyFilters() {
    return this.showDeleted ? this.deletedContractors : this.contractors.filter(c => {
      const matchesName = !this.nameFilter || c.name.toLowerCase().includes(this.nameFilter.toLowerCase());
      const matchesType = !this.typeFilter || c.type === this.typeFilter;
      return matchesName && matchesType;
    });
  }

  get filteredContractors(): ContractorDto[] {
    return this.applyFilters();
  }

  addContractor() {
    if (!this.newContractor.name || !this.newContractor.type || !this.newContractor.email || !this.newContractor.taxId) {
      this.errorMessage = 'Nazwa, typ, email i NIP są wymagane.';
      return;
    }
    this.http.post<ContractorDto>(this.apiUrl, this.newContractor).subscribe({
      next: (response) => {
        this.successMessage = `Dodano kontrahenta: ${response.name}`;
        this.errorMessage = null;
        this.loadContractors();
        this.toggleAddForm();
      },
      error: (error) => this.errorMessage = `Błąd dodawania kontrahenta: ${error.status} ${error.message}`
    });
  }

  startEdit(contractor: ContractorDto) {
    this.editContractor = { ...contractor };
  }

  updateContractor() {
    if (!this.editContractor || !this.editContractor.name || !this.editContractor.type || !this.editContractor.email || !this.editContractor.taxId) {
      this.errorMessage = 'Nazwa, typ, email i NIP są wymagane.';
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

  deleteContractor(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.successMessage = 'Kontrahent usunięty.';
        this.errorMessage = null;
        this.loadContractors();
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

  toggleDeletedView() {
    this.showDeleted = !this.showDeleted;
    this.applyFilters();
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    this.errorMessage = null;
    this.successMessage = null;
    if (!this.showAddForm) {
      this.newContractor = { name: '', type: 'Supplier', email: '', phone: '', address: '', taxId: '' };
    }
  }

  cancelEdit() {
    this.editContractor = null;
  }

  navigateTo(page: string) {
    this.router.navigate([page]); // Obsługuje ścieżki z "/" z sidebara
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
