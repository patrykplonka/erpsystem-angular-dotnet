import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-add-contractor',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './add-contractor.component.html',
  styleUrls: ['./add-contractor.component.css']
})
export class AddContractorComponent {
  newContractor: CreateContractorDto = { name: '', type: 'Supplier', email: '', phone: '', address: '', taxId: '' };
  errorMessage: string | null = null;
  successMessage: string | null = null;
  contractorTypes: { display: string, value: string }[] = [
    { display: 'Dostawca', value: 'Supplier' },
    { display: 'Klient', value: 'Client' },
    { display: 'Oba', value: 'Both' }
  ];

  private apiUrl = 'https://localhost:7224/api/contractors';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

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

  addContractor() {
    if (!this.newContractor.name || !this.newContractor.type || !this.newContractor.email || !this.newContractor.taxId) {
      this.errorMessage = 'Nazwa, typ, email i NIP są wymagane.';
      return;
    }
    if (!this.isValidNip(this.newContractor.taxId)) {
      this.errorMessage = 'Podany NIP jest nieprawidłowy.';
      return;
    }
    this.http.post<ContractorDto>(this.apiUrl, this.newContractor).subscribe({
      next: (response) => {
        this.successMessage = `Dodano kontrahenta: ${response.name}`;
        this.errorMessage = null;
        this.newContractor = { name: '', type: 'Supplier', email: '', phone: '', address: '', taxId: '' };
        setTimeout(() => this.router.navigate(['/contractors']), 2000);
      },
      error: (error) => this.errorMessage = `Błąd dodawania kontrahenta: ${error.status} ${error.message}`
    });
  }

  cancel() {
    this.router.navigate(['/contractors']);
  }

  navigateTo(page: string) {
    this.router.navigate([page]);
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
