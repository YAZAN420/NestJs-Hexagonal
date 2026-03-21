import { ProductRepository } from 'src/products/application/ports/product.repository';
import { Product } from 'src/products/domain/product';
import { ProductMapper } from '../mappers/product.mapper';
import { Product as InMemoryProduct } from '../entities/product.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, InMemoryProduct>();
  constructor(private readonly productMapper: ProductMapper) {}

  async findAll(): Promise<Product[]> {
    const entities = Array.from(this.products.values());
    return Promise.resolve(
      entities.map((entity) => this.productMapper.toDomain(entity)),
    );
  }
  async save(product: Product): Promise<void> {
    const persistenceData = this.productMapper.toPersistence(product);
    this.products.set(product.getId(), persistenceData as InMemoryProduct);
    return Promise.resolve();
  }
  async delete(id: string): Promise<void> {
    this.products.delete(id);
    return Promise.resolve();
  }
  async findById(id: string): Promise<Product | null> {
    const entity = this.products.get(id);
    if (!entity) return null;
    return Promise.resolve(this.productMapper.toDomain(entity));
  }
}
