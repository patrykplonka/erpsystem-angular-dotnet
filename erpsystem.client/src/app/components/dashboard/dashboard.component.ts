import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { DashboardContentComponent } from '../dashboard-content/dashboard-content.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, DashboardContentComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUserEmail: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUserEmail = localStorage.getItem('userEmail');
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
