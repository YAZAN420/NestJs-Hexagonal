import { Module } from '@nestjs/common';
import { HashingPort } from '../../application/ports/hashing.port';
import { BcryptAdapter } from './bcrypt.adapter';

@Module({
  providers: [
    {
      provide: HashingPort,
      useClass: BcryptAdapter,
    },
  ],
  exports: [HashingPort],
})
export class HashingModule {}
