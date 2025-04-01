import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router'; 
import { tap } from 'rxjs/operators'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5206/api/auth';

  constructor(private http: HttpClient, private router: Router) { } 


  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response: any) => {
        this.saveToken(response.token);        
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


  getToken() {
    return localStorage.getItem('token');
  }

  
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  
  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']); 
  }
}
