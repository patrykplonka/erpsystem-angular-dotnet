import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

interface LoginResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7224/api/auth';

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response: LoginResponse) => {
        this.saveToken(response.token);
        localStorage.setItem('userEmail', response.email);
        localStorage.setItem('userFirstName', response.firstName || 'Unknown');
        localStorage.setItem('userLastName', response.lastName || '');
        console.log('Login - Saved to localStorage:', {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName
        });
        this.router.navigate(['/dashboard']);
      })
    );
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userLastName');
    this.router.navigate(['/login']);
  }

  getCurrentUserEmail(): string | null {
    return localStorage.getItem('userEmail');
  }

  getCurrentUserFullName(): string {
    const firstName = localStorage.getItem('userFirstName') || 'Unknown';
    const lastName = localStorage.getItem('userLastName') || '';
    const fullName = `${firstName} ${lastName}`.trim();
    console.log('getCurrentUserFullName - Returning:', fullName);
    return fullName;
  }
}
