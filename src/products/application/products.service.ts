/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';

import { CreateProductCommand } from './command/create-product.command';
import { UpdateProductCommand } from './command/update-product.command';
import { ProductFactory } from 'src/products/domain/factories/product.factory';
import { Product } from '../domain/product';
import { ProductRepository } from 'src/products/application/ports/product.repository';

@Injectable()
export class ProductsService {
  constructor(
    protected readonly productRepository: ProductRepository,
    protected readonly productFactory: ProductFactory,
    private readonly cls: ClsService,
  ) {}
  async create(command: CreateProductCommand): Promise<Product> {
    const user = this.cls.get<ActiveUserData>('User');

    const newProduct = this.productFactory.createNew(
      command.name,
      command.description,
      command.price,
      user.id,
    );
    await this.productRepository.save(newProduct);

    return newProduct;
  }
  async findAll() {
    return await this.productRepository.findAll();
  }

  async findOne(id: string): Promise<Product> {
    const doc = await this.productRepository.findById(id);
    if (!doc) {
      throw new NotFoundException(
        'Product not found or you do not have permission to read it',
      );
    }
    return doc;
  }

  async update(command: UpdateProductCommand): Promise<Product> {
    const prouct = await this.productRepository.findById(command.id);

    if (!prouct) {
      throw new NotFoundException(
        'Product not found or you do not have permission to update it',
      );
    }
    const { id, ...updatePayload } = command;
    prouct.updateDetails(updatePayload);
    return prouct;
  }

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException('User not found');
    await this.productRepository.delete(id);
    return { message: 'Document deleted successfully' };
  }
}
