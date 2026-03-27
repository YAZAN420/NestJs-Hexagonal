import { ProductRepository } from 'src/products/application/ports/product.repository';
import { Product } from 'src/products/domain/product';
import { ProductMapper } from '../mappers/product.mapper';
import { Product as InMemoryProduct } from '../entities/product.entity';
import { Injectable } from '@nestjs/common';
import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from 'src/common/pagination/offset';
import {
  CursorPageDto,
  CursorPageMetaDto,
  CursorPageOptionsDto,
} from 'src/common/pagination/cursor';

@Injectable()
export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, InMemoryProduct>();
  constructor(private readonly productMapper: ProductMapper) {}

  findAll(options: PageOptionsDto): Promise<PageDto<Product>> {
    const entities = Array.from(this.products.values());
    const domainProducts = entities.map((entity) =>
      this.productMapper.toDomain(entity),
    );
    const startIndex = options.skip;
    const endIndex = startIndex + options.take;
    const paginatedItems = domainProducts.slice(startIndex, endIndex);
    const itemCount = domainProducts.length;
    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: options,
    });
    return Promise.resolve(new PageDto(paginatedItems, pageMetaDto));
  }

  async findAllCursor(
    options: CursorPageOptionsDto,
  ): Promise<CursorPageDto<Product>> {
    const { cursor, take } = options;

    const entities = Array.from(this.products.values());
    const domainProducts = entities.map((entity) =>
      this.productMapper.toDomain(entity),
    );

    domainProducts.sort((a, b) => b.getId().localeCompare(a.getId()));
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = domainProducts.findIndex((p) => p.getId() === cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }
    const paginatedItems = domainProducts.slice(
      startIndex,
      startIndex + take + 1,
    );
    const hasNextPage = paginatedItems.length > take;
    if (hasNextPage) {
      paginatedItems.pop();
    }
    const endCursor =
      paginatedItems.length > 0
        ? paginatedItems[paginatedItems.length - 1].getId()
        : null;
    const meta = new CursorPageMetaDto(hasNextPage, endCursor);
    return Promise.resolve(new CursorPageDto(paginatedItems, meta));
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
