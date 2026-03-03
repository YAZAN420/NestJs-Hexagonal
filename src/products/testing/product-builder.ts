import { Product } from '../domain/product';

type ProductOverrides = Partial<{
  id: string;
  name: string;
  description: string;
  price: number;
  createdBy: string;
}>;

export const createMockProduct = (overrides: ProductOverrides = {}): Product =>
  new Product(
    overrides.id || '1',
    overrides.name || 'Laptop',
    overrides.description || 'This is a laptop',
    overrides.price || 100,
    overrides.createdBy || 'user-123',
    new Date(),
    new Date(),
  );
