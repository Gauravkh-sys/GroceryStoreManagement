import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { LanguageService } from '../../services/language.service';
import { StoreApiService } from '../../services/store-api.service';

@Component({
  selector: 'app-product-request',
  imports: [ReactiveFormsModule],
  templateUrl: './product-request.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRequestComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(GroceryStoreService);
  private readonly api = inject(StoreApiService);
  readonly language = inject(LanguageService);
  readonly message = signal('');
  readonly isSubmitting = signal(false);
  readonly requestForm = this.formBuilder.nonNullable.group({
    productName: ['', [Validators.required, Validators.maxLength(60)]],
    details: ['', Validators.maxLength(240)],
    customerName: ['', [Validators.required, Validators.maxLength(60)]],
    customerMobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  submitRequest(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.message.set('');
    this.api.createProductRequest(this.requestForm.getRawValue()).subscribe({
      next: (request) => {
        this.store.recordDatabaseRequest({
          ...request,
          source: 'database',
        });
        this.requestForm.reset({
          productName: '',
          details: '',
          customerName: '',
          customerMobile: '',
        });
        this.message.set('Product request saved to the database.');
      },
      error: (cause: unknown) => {
        console.error('Unable to save product request to the database.', cause);
        this.message.set(
          this.api.errorMessage(
            cause,
            'Unable to save the request. Please try again.',
          ),
        );
        this.isSubmitting.set(false);
      },
      complete: () => this.isSubmitting.set(false),
    });
  }
}
