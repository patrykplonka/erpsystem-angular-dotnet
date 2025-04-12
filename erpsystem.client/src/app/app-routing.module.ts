import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { ProductManagementComponent } from './components/product-management/product-management.component';
import { WarehouseMovementsComponent } from './components/warehouse-movements/warehouse-movements.component';
import { WarehouseReportsComponent } from './components/warehouse-reports/warehouse-reports.component';
import { ContractorsComponent } from './components/contractors/contractors.component';
import { OrdersComponent } from './components/orders/orders.component'; 
  
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'products', component: ProductManagementComponent, canActivate: [AuthGuard] },
  { path: 'movements', component: WarehouseMovementsComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: WarehouseReportsComponent, canActivate: [AuthGuard] },
  { path: 'contractors', component: ContractorsComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
