import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  constructor(private authService: AuthService, private router: Router) { }

  logout() {
    this.authService.logout(); // Wywołanie metody logowania
    this.router.navigate(['/login']); // Przekierowanie do logowania
  }
}
