import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Dla router-outlet

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule], // Niezbędny moduł
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
}
