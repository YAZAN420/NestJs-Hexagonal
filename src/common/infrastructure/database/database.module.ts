import { Global, Module } from '@nestjs/common';
import { UnitOfWorkPort } from '../../application/ports/unit-of-work.port';
import { MongooseUnitOfWorkAdapter } from './mongoose-uow.adapter';
import { InMemoryUnitOfWorkAdapter } from './in-memory-uow.adapter';

@Global()
@Module({
  providers: [],
  exports: [UnitOfWorkPort],
})
export class DatabaseModule {
  static use(driver: 'mongoose' | 'in-memory') {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: UnitOfWorkPort,
          useClass:
            driver === 'in-memory'
              ? InMemoryUnitOfWorkAdapter
              : MongooseUnitOfWorkAdapter,
        },
      ],
      exports: [UnitOfWorkPort],
    };
  }
}
