import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { IamModule } from './iam/iam.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { validate } from './config/env.validation';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ProductsModule,
    UsersModule,
    IamModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validate: validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    MongooseModule.forRootAsync({
      useFactory: (
        databaseConfiguration: ConfigType<typeof databaseConfig>,
      ) => ({
        uri: databaseConfiguration.uri,
      }),
      inject: [databaseConfig.KEY],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
