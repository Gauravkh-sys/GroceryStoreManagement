import { FulfillmentMethod, StoreOrder } from '../models/grocery.model';
import { GroceryStoreService } from '../services/grocery-store.service';

export function createTestOrder(
  store: GroceryStoreService,
  fulfillmentMethod: FulfillmentMethod = 'pickup',
): StoreOrder {
  const product = store.products()[0];
  if (!product || !store.addToCart(product.id)) {
    throw new Error('Unable to add the test product to the basket.');
  }

  const result = store.createOrder(
    'Test shopper',
    '1234567890',
    fulfillmentMethod,
    fulfillmentMethod === 'delivery' ? '12 Test Street' : '',
  );
  if (!result.success) {
    throw new Error(`Unable to create the test order: ${result.reason}`);
  }
  return result.order;
}
