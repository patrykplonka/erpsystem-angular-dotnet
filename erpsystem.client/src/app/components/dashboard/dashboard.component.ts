import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  userEmail: string | null = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.userEmail = localStorage.getItem('userEmail'); // Pobieranie emaila
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']); // Przekierowanie do logowania
  }
}
