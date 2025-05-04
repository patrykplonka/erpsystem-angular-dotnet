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
import { InvoiceComponent } from './components/invoice/invoice.component';
import { OrderFormComponent } from './components/order-form/order-form.component';
import { AddWarehouseMovementComponent } from './components/add-warehouse-movements/add-warehouse-movements-component';
import { AddProductFormComponent } from './components/add-product-form/add-product-form-component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'products', component: ProductManagementComponent, canActivate: [AuthGuard] },
  { path: 'add-product', component: AddProductFormComponent, canActivate: [AuthGuard] },
  { path: 'movements', component: WarehouseMovementsComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: WarehouseReportsComponent, canActivate: [AuthGuard] },
  { path: 'contractors', component: ContractorsComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
  { path: 'orders/new', component: OrderFormComponent, canActivate: [AuthGuard] },
  { path: 'orders/edit/:id', component: OrderFormComponent, canActivate: [AuthGuard] },
  { path: 'invoices', component: InvoiceComponent, canActivate: [AuthGuard] },
  { path: 'add-warehouse-movement', component: AddWarehouseMovementComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
