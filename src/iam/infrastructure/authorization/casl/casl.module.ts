import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { AuthorizationPort } from '../../../application/ports/authorization.port';
import { CaslAdapter } from './casl.adapter';

@Module({
  providers: [
    CaslAbilityFactory,
    {
      provide: AuthorizationPort,
      useClass: CaslAdapter, // ربط الواجهة بالتنفيذ
    },
  ],
  exports: [AuthorizationPort],
})
export class CaslModule {}
