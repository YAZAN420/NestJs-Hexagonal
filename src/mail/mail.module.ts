import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import mailConfig from 'src/config/mail.config';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
