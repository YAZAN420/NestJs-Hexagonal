import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { ThrottlerModule } from '@nestjs/throttler';

import { ApplicationBootstrapOptions } from 'src/common/interfaces/application-bootstrap-options.interface';
import databaseConfig from 'src/config/database.config';
import appConfig from 'src/config/app.config';
import { validate } from 'src/config/env.validation';

@Global()
@Module({})
export class CoreModule {
  static forRoot(options: ApplicationBootstrapOptions): DynamicModule {
    const dbImports =
      options.driver === 'mongoose'
        ? [
            MongooseModule.forRootAsync({
              useFactory: (
                databaseConfiguration: ConfigType<typeof databaseConfig>,
              ) => ({
                uri: databaseConfiguration.uri,
              }),
              inject: [databaseConfig.KEY],
            }),
          ]
        : [];

    return {
      module: CoreModule,
      imports: [
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
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
        ...dbImports,
      ],
      exports: [ConfigModule, ClsModule],
    };
  }
}
