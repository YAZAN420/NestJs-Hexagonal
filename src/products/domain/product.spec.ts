import { createMockProduct } from '../testing/product-builder';
import { Product } from './product';

describe('Product Domain Entity', () => {
  const initialDate = new Date('2026-01-01T10:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(initialDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Constructor and Getters', () => {
    it('should create a product instance and return correct values via getters', () => {
      const product = createMockProduct({
        id: 'prod-1',
        name: 'Test Product',
        description: 'Test Description',
        price: 100,
        createdBy: 'user-123',
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      expect(product.getId()).toBe('prod-1');
      expect(product.getName()).toBe('Test Product');
      expect(product.getDescription()).toBe('Test Description');
      expect(product.getPrice()).toBe(100);
      expect(product.createdBy).toBe('user-123');
      expect(product.getCreatedAt()).toEqual(initialDate);
      expect(product.getUpdatedAt()).toEqual(initialDate);
    });
  });

  describe('updateDetails', () => {
    let product: Product;

    beforeEach(() => {
      jest.setSystemTime(initialDate);
      product = createMockProduct({
        id: 'prod-1',
        name: 'Old Name',
        description: 'Old Description',
        price: 100,
        createdBy: 'user-123',
        createdAt: initialDate,
        updatedAt: initialDate,
      });
    });

    it('should update all provided fields correctly', () => {
      const updatePayload = {
        name: 'New Name',
        description: 'New Description',
        price: 250,
      };

      product.updateDetails(updatePayload);

      expect(product.getName()).toBe(updatePayload.name);
      expect(product.getDescription()).toBe(updatePayload.description);
      expect(product.getPrice()).toBe(updatePayload.price);
    });

    it('should partially update fields (e.g., only price) and leave others intact', () => {
      const updatePayload = { price: 500 };

      product.updateDetails(updatePayload);

      expect(product.getPrice()).toBe(updatePayload.price);
      expect(product.getName()).toBe('Old Name');
      expect(product.getDescription()).toBe('Old Description');
    });

    it('should update the updatedAt date automatically when details change', () => {
      const newDate = new Date('2026-01-01T11:00:00.000Z');
      jest.setSystemTime(newDate);

      product.updateDetails({ price: 150 });

      expect(product.getUpdatedAt()).toEqual(newDate);
      expect(product.getCreatedAt()).toEqual(initialDate);
    });
    it('should correctly update fields with falsy valid values (like 0 or empty string)', () => {
      const updatePayload = {
        name: '',
        price: 0,
      };

      product.updateDetails(updatePayload);

      expect(product.getName()).toBe('');
      expect(product.getPrice()).toBe(0);
      expect(product.getDescription()).toBe('Old Description');
    });

    it('should only update the updatedAt date if an empty payload is provided', () => {
      const newDate = new Date('2026-01-01T11:00:00.000Z');
      jest.setSystemTime(newDate);

      product.updateDetails({});

      expect(product.getName()).toBe('Old Name');
      expect(product.getPrice()).toBe(100);
      expect(product.getDescription()).toBe('Old Description');

      expect(product.getUpdatedAt()).toEqual(newDate);
    });
  });
});
