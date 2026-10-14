import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-product-request',
  imports: [ReactiveFormsModule],
  templateUrl: './product-request.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRequestComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(GroceryStoreService);
  readonly language = inject(LanguageService);
  readonly message = signal('');
  readonly requestForm = this.formBuilder.nonNullable.group({
    productName: ['', [Validators.required, Validators.maxLength(60)]],
    details: ['', Validators.maxLength(240)],
    customerName: ['', [Validators.required, Validators.maxLength(60)]],
    customerMobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    const accepted = this.store.createProductRequest(
      this.requestForm.getRawValue(),
    );
    if (!accepted) {
      this.message.set('Unable to submit the product request.');
      return;
    }
    this.requestForm.reset({
      productName: '',
      details: '',
      customerName: '',
      customerMobile: '',
    });
    this.message.set('Product request sent to the store manager.');
  }
}
