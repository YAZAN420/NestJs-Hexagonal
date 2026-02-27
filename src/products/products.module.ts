import { DynamicModule, Module, Type } from '@nestjs/common';
import { ProductsService } from './application/products.service';
import { CaslModule } from 'src/iam/infrastructure/authorization/casl/casl.module';
import { ProductsController } from './presentation/http/products.controller';
import { ProductFactory } from 'src/products/domain/factories/product.factory';

@Module({
  imports: [CaslModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductFactory],
  exports: [ProductFactory],
})
export class ProductsModule {
  static withInfrastructure(infrastuctureModule: Type | DynamicModule) {
    return {
      module: ProductsModule,
      imports: [infrastuctureModule],
      exports: [infrastuctureModule],
    };
  }
}
