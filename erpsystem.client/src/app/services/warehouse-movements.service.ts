import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WarehouseMovementsService {
  private apiUrl = 'https://localhost:7224/api/WarehouseMovements';

  constructor(private http: HttpClient) { }

  createMovement(movement: WarehouseMovementDTO): Observable<WarehouseMovementDTO> {
    return this.http.post<WarehouseMovementDTO>(this.apiUrl, movement);
  }

  getMovementsByItem(warehouseItemId: number): Observable<WarehouseMovementDTO[]> {
    const url = `${this.apiUrl}/item/${warehouseItemId}`;
    return this.http.get<WarehouseMovementDTO[]>(url);
  }

  getAllMovements(): Observable<WarehouseMovementDTO[]> {
    return this.http.get<WarehouseMovementDTO[]>(this.apiUrl); 
  }

  getMovementsInPeriod(start: string, end: string): Observable<WarehouseMovementDTO[]> {
    const url = `${this.apiUrl}/period?start=${start}&end=${end}`;
    return this.http.get<WarehouseMovementDTO[]>(url);
  }
}

interface WarehouseMovementDTO {
  id?: number;
  warehouseItemId: number;
  movementType: string;
  quantity: number;
  supplier: string;
  documentNumber: string;
  date: string;
  description: string;
  createdBy: string;
  status: string;
  comment: string;
  orderId?: number | null;
}
