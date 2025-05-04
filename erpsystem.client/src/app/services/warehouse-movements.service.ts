import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

interface CreateWarehouseItemDto {
  name: string;
  code: string;
  quantity: number;
  price: number; // Changed from unitPrice
  category: string;
  location: string;
  warehouse: string;
  unitOfMeasure: string;
  minimumStock: number;
  contractorId: number | null;
  batchNumber: string;
  expirationDate: string | null;
  purchaseCost: number;
  vatRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class WarehouseMovementsService {
  private apiUrl = 'https://localhost:7224/api/WarehouseMovements';
  private warehouseApiUrl = 'https://localhost:7224/api/Warehouse';

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

  addProduct(item: CreateWarehouseItemDto): Observable<CreateWarehouseItemDto> {
    return this.http.post<CreateWarehouseItemDto>(this.warehouseApiUrl, item);
  }
}
