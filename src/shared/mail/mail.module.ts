import { Global, Module } from '@nestjs/common';
import mailConfig from 'src/config/mail.config';
import { ConfigModule } from '@nestjs/config';
import { MailPort } from './application/ports/mail.port';
import { NodemailerAdapter } from './infrastructure/adapters/nodemailer.adapter';

@Global()
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [
    {
      provide: MailPort,
      useClass: NodemailerAdapter,
    },
  ],
  exports: [MailPort],
})
export class MailModule {}
