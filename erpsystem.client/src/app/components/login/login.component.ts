import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';   
import { AuthService } from '../../services/auth.service'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  login() {
    this.authService.login(this.email, this.password).subscribe(
      response => {
        // Logika po udanym logowaniu, np. przekierowanie
        this.router.navigate(['/dashboard']); // Dostosuj ścieżkę
      },
      error => {
        this.errorMessage = 'Niepoprawny email lub hasło!';
      }
    );
  }
}
