import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface OrderDto {
  id: number;
  orderNumber: string;
  contractorId: number;
  orderType: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  createdBy: string;
  createdDate: string;
  isDeleted: boolean;
  orderItems: OrderItemDto[];
}

interface OrderItemDto {
  id: number;
  orderId: number;
  warehouseItemId: number;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

interface ContractorDto {
  id: number;
  name: string;
}

interface WarehouseItemDto {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-order-form',
  templateUrl: './order-form.component.html',
  styleUrls: ['./order-form.component.css'],
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true
})
export class OrderFormComponent {
  @Input() order: OrderDto | null = null;
  @Input() contractors: ContractorDto[] = [];
  @Input() warehouseItems: WarehouseItemDto[] = [];
  @Input() orderTypes: { value: string; display: string }[] = [];
  @Output() orderSaved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  orderForm: FormGroup;
  apiUrl = 'https://localhost:7224/api/orders';
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.orderForm = this.fb.group({
      orderNumber: [{ value: '', disabled: true }],
      contractorId: [null, [Validators.required, Validators.min(1)]],
      orderType: ['', Validators.required],
      orderDate: ['', Validators.required],
      orderItems: this.fb.array([])
    });
  }

  ngOnInit() {
    if (this.order) {
      this.orderForm.patchValue({
        orderNumber: this.order.orderNumber,
        contractorId: this.order.contractorId,
        orderType: this.order.orderType,
        orderDate: new Date(this.order.orderDate).toISOString().split('T')[0]
      });
      this.order.orderItems.forEach(item => this.addOrderItem(item));
    } else {
      this.orderForm.patchValue({
        orderDate: new Date().toISOString().split('T')[0]
      });
      this.http.get<{ orderNumber: string }>(`${this.apiUrl}/generate-order-number?orderType=Purchase`).subscribe({
        next: (data) => {
          this.orderForm.patchValue({ orderNumber: data.orderNumber });
          this.cdr.markForCheck();
        },
        error: (error) => this.errorMessage = `Błąd generowania numeru: ${error.message}`
      });
      this.addOrderItem();
    }
  }

  get orderItems(): FormArray<FormGroup> {
    return this.orderForm.get('orderItems') as FormArray<FormGroup>;
  }

  addOrderItem(item?: OrderItemDto) {
    const itemGroup = this.fb.group({
      warehouseItemId: [item?.warehouseItemId || null, [Validators.required, Validators.min(1)]],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unitPrice: [{ value: item?.unitPrice || 0, disabled: true }],
      vatRate: [item?.vatRate ? item.vatRate * 100 : 23, [Validators.required, Validators.min(0)]], // Store as percentage
      totalPrice: [{ value: item?.totalPrice || 0, disabled: true }]
    });
    itemGroup.get('warehouseItemId')?.valueChanges.subscribe(() => this.updateOrderItem(itemGroup));
    itemGroup.get('quantity')?.valueChanges.subscribe(() => this.updateOrderItem(itemGroup));
    itemGroup.get('vatRate')?.valueChanges.subscribe(() => this.updateOrderItem(itemGroup));
    this.orderItems.push(itemGroup);
    this.cdr.markForCheck();
  }

  removeOrderItem(index: number) {
    this.orderItems.removeAt(index);
    this.updateTotalAmount();
    this.cdr.markForCheck();
  }

  updateOrderItem(itemGroup: FormGroup) {
    const warehouseItemId = itemGroup.get('warehouseItemId')?.value;
    const selectedItem = this.warehouseItems.find(wi => wi.id === warehouseItemId);
    if (selectedItem) {
      itemGroup.patchValue({
        unitPrice: selectedItem.unitPrice
      });
      const quantity = itemGroup.get('quantity')?.value;
      const vatRate = itemGroup.get('vatRate')?.value / 100; // Convert percentage to decimal
      const totalPrice = quantity * selectedItem.unitPrice * (1 + vatRate);
      itemGroup.patchValue({ totalPrice: Number(totalPrice.toFixed(2)) });
    } else {
      itemGroup.patchValue({ unitPrice: 0, totalPrice: 0 });
    }
    this.updateTotalAmount();
    this.cdr.markForCheck();
  }

  updateTotalAmount() {
    const total = this.orderItems.controls.reduce((sum, item) => sum + (item.get('totalPrice')?.value || 0), 0);
    this.orderForm.patchValue({ totalAmount: Number(total.toFixed(2)) });
    this.cdr.markForCheck();
  }

  onOrderTypeChange() {
    this.http.get<{ orderNumber: string }>(`${this.apiUrl}/generate-order-number?orderType=${this.orderForm.get('orderType')?.value}`).subscribe({
      next: (data) => {
        this.orderForm.patchValue({ orderNumber: data.orderNumber });
        this.cdr.markForCheck();
      },
      error: (error) => this.errorMessage = `Błąd generowania numeru: ${error.message}`
    });
  }

  saveOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      const errors = this.getFormValidationErrors();
      this.errorMessage = `Formularz zawiera błędy: ${errors.join(', ')}`;
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    const formValue = this.orderForm.getRawValue();

    const payload: OrderDto = {
      id: this.order?.id || 0,
      orderNumber: formValue.orderNumber,
      contractorId: Number(formValue.contractorId),
      orderType: formValue.orderType,
      orderDate: formValue.orderDate,
      totalAmount: Number(this.orderItems.controls.reduce((sum, item) => sum + (item.get('totalPrice')?.value || 0), 0).toFixed(2)),
      status: 'Draft',
      createdBy: 'System',
      createdDate: new Date().toISOString().split('T')[0],
      isDeleted: false,
      orderItems: formValue.orderItems.map((item: any) => ({
        id: item.id || 0,
        orderId: this.order?.id || 0,
        warehouseItemId: Number(item.warehouseItemId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate) / 100, // Convert percentage to decimal
        totalPrice: Number(item.totalPrice)
      }))
    };

    const request = this.order
      ? this.http.put(`${this.apiUrl}/${this.order.id}`, payload)
      : this.http.post(this.apiUrl, payload);

    request.subscribe({
      next: () => {
        this.orderSaved.emit();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const serverMessage = error.error?.errors ? JSON.stringify(error.error.errors) : error.message;
        this.errorMessage = `Błąd zapisu zamówienia: ${serverMessage}`;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelForm() {
    this.cancel.emit();
  }

  private getFormValidationErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.orderForm.controls).forEach(key => {
      const controlErrors = this.orderForm.get(key)?.errors;
      if (controlErrors) {
        Object.keys(controlErrors).forEach(error => errors.push(`${key}: ${error}`));
      }
    });
    this.orderItems.controls.forEach((group: FormGroup, index: number) => {
      Object.keys(group.controls).forEach(key => {
        const controlErrors = group.get(key)?.errors;
        if (controlErrors) {
          Object.keys(controlErrors).forEach(error => errors.push(`orderItems[${index}].${key}: ${error}`));
        }
      });
    });
    return errors;
  }
}
