import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';

import { CreateProductCommand } from './commands/create-product.command';
import { UpdateProductCommand } from './commands/update-product.command';
import { ProductFactory } from 'src/products/domain/factories/product.factory';
import { Product } from '../domain/product';
import { ProductRepository } from 'src/products/application/ports/product.repository';
import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { Action } from 'src/iam/domain/enums/action.enum';
import { UnitOfWorkPort } from 'src/common/application/ports/unit-of-work.port';
import { CachePort } from 'src/common/application/ports/cache.port';

@Injectable()
export class ProductsCommandService {
  constructor(
    protected readonly productRepository: ProductRepository,
    protected readonly productFactory: ProductFactory,
    protected readonly authPort: AuthorizationPort,
    protected readonly unitOfWork: UnitOfWorkPort,
    protected readonly cachePort: CachePort,
  ) {}
  async create(
    user: ActiveUserData,
    command: CreateProductCommand,
  ): Promise<Product> {
    return this.unitOfWork.execute(async () => {
      const newProduct = this.productFactory.createNew(
        command.name,
        command.description,
        command.price,
        user.id,
      );
      await this.productRepository.save(newProduct);
      await this.clearProductsCache();
      return newProduct;
    });
  }

  async update(
    user: ActiveUserData,
    command: UpdateProductCommand,
  ): Promise<Product> {
    return this.unitOfWork.execute(async () => {
      const product = await this.productRepository.findById(command.id);
      if (!product) {
        throw new NotFoundException(
          'Product not found or you do not have permission to update it',
        );
      }

      const isAllowed = this.authPort.checkPermission(
        user,
        Action.Update,
        product,
      );

      if (!isAllowed) {
        throw new ForbiddenException(
          'You do not have permission to update this specific product, you are not the owner!',
        );
      }

      const { id: _, ...updatePayload } = command;
      product.updateDetails(updatePayload);

      await this.productRepository.save(product);
      await this.clearProductsCache();
      return product;
    });
  }

  async remove(user: ActiveUserData, id: string): Promise<{ message: string }> {
    return this.unitOfWork.execute(async () => {
      const product = await this.productRepository.findById(id);
      if (!product) throw new NotFoundException('Product not found');

      const isAllowed = this.authPort.checkPermission(
        user,
        Action.Delete,
        product,
      );

      if (!isAllowed) {
        throw new ForbiddenException(
          'You do not have permission to delete this specific product, you are not the owner!',
        );
      }

      await this.productRepository.delete(id);
      await this.clearProductsCache();
      return { message: 'Document deleted successfully' };
    });
  }
  private async clearProductsCache() {
    await this.cachePort.deleteByPattern('GET:/products*');
  }
}
