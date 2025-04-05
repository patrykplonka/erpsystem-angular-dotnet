import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component'; 
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [], 
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    CommonModule
  ],
  providers: [AuthService,AuthGuard],
  bootstrap: [AppComponent] 
})
export class AppModule { }
