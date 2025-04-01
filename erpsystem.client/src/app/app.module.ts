import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Importowanie komponentu standalone
import { AppComponent } from './app.component';
// Nie importujemy LoginComponent i DashboardComponent do declarations ani imports

@NgModule({
  declarations: [], // Brak deklaracji, bo wszystkie komponenty są standalone
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    FormsModule,
    AppComponent // Importujemy AppComponent jako standalone
  ],
  providers: [],
  bootstrap: [AppComponent] // AppComponent jako komponent bootstrap
})
export class AppModule { }
