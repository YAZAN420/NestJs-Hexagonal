import { Injectable, NotFoundException } from '@nestjs/common';

import { Product } from '../domain/product';
import { ProductRepository } from 'src/products/application/ports/product.repository';
import { GetProductByIdQuery } from './queries/get-product-by-id.query';
import { PageOptionsDto } from 'src/common/pagination/offset';
import { CursorPageOptionsDto } from 'src/common/pagination/cursor';

@Injectable()
export class ProductsQueryService {
  constructor(protected readonly productRepository: ProductRepository) {}

  async findAll(pageOptionsDto: PageOptionsDto) {
    return this.productRepository.findAll(pageOptionsDto);
  }

  async findAllCursor(options: CursorPageOptionsDto) {
    return this.productRepository.findAllCursor(options);
  }

  async findOne(query: GetProductByIdQuery): Promise<Product> {
    const doc = await this.productRepository.findById(query.id);
    if (!doc) {
      throw new NotFoundException(
        'Product not found or you do not have permission to read it',
      );
    }
    return doc;
  }
}
