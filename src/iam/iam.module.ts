import { Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';

@Module({
  imports: [],
  controllers: [],
  providers: [{ provide: HashingService, useClass: BcryptService }],
  exports: [HashingService],
})
export class IamModule {}
