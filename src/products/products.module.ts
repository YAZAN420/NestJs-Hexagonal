import { DynamicModule, Module, Type } from '@nestjs/common';
import { CaslModule } from 'src/iam/infrastructure/authorization/casl/casl.module';
import { ProductsController } from './presentation/http/products.controller';
import { ProductFactory } from 'src/products/domain/factories/product.factory';
import { ProductsCommandService } from './application/products-command.service';
import { ProductsQueryService } from './application/products-query.service';

@Module({
  imports: [CaslModule],
  controllers: [ProductsController],
  providers: [ProductsCommandService, ProductsQueryService, ProductFactory],
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
