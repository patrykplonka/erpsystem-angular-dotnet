import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './components/login/login.component';
import { AuthService } from './services/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [HttpClientTestingModule, FormsModule, ReactiveFormsModule],  // Dodajemy ReactiveFormsModule
      providers: [AuthService]  // Zapewniamy serwis do testowania
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);  // Inicjalizujemy serwis autentykacji
    fixture.detectChanges();  // Wymuszamy detekcję zmian, aby zainicjować formularz
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should log in successfully', () => {
    const mockResponse = { token: 'mock_token' };  // Symulujemy odpowiedź serwera

    const email = 'test@example.com';
    const password = 'password123';

    component.email = email;
    component.password = password;

    component.login();  // Wywołujemy metodę login()

    const req = httpMock.expectOne('https://localhost:5206/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email, password });
    req.flush(mockResponse);  // Symulujemy odpowiedź serwera

    expect(authService.getToken()).toBe('mock_token');  // Sprawdzamy, czy token jest zapisany
  });

  it('should handle login error', () => {
    const errorMessage = 'Invalid credentials';
    const email = 'test@example.com';
    const password = 'wrongpassword';

    component.email = email;
    component.password = password;

    component.login();  // Wywołujemy metodę login()

    const req = httpMock.expectOne('https://localhost:5206/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(errorMessage, { status: 401, statusText: 'Unauthorized' });  // Symulujemy błąd

    // Sprawdzenie, czy token nie został zapisany
    expect(authService.getToken()).toBeNull();
  });
});
