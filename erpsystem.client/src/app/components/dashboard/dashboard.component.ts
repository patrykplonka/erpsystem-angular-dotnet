import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUserEmail: string | null = null; 

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.currentUserEmail = localStorage.getItem('userEmail');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
