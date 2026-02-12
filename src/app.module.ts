import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { IamModule } from './iam/iam.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ProductsModule, UsersModule, IamModule, ConfigModule.forRoot()],
  controllers: [],
  providers: [],
})
export class AppModule {}
