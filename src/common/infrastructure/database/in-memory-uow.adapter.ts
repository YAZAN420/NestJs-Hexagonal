import { Injectable } from '@nestjs/common';
import { UnitOfWorkPort } from '../../application/ports/unit-of-work.port';

@Injectable()
export class InMemoryUnitOfWorkAdapter implements UnitOfWorkPort {
  async execute<T>(work: () => Promise<T>): Promise<T> {
    return await work();
  }
}
