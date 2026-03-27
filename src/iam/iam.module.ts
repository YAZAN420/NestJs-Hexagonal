import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';

import jwtConfig from 'src/config/jwt.config';
import { MailModule } from 'src/shared/mail/mail.module';

import { AuthenticationService } from './application/services/authentication.service';

import { CaslModule } from './infrastructure/authorization/casl/casl.module';
import { JwtStrategy } from './infrastructure/authentication/strategies/jwt.strategy';
import { LocalStrategy } from './infrastructure/authentication/strategies/local.strategy';

import { AuthenticationController } from './presentation/http/authentication.controller';
import { AccessTokenGuard } from './presentation/http/guards/access-token.guard';
import { RolesGuard } from './presentation/http/guards/roles.guard';

import { UsersModule } from 'src/users/users.module';
import { HashingModule } from './infrastructure/hashing/hashing.module';
import { BullModule } from '@nestjs/bullmq';
import { MailProcessor } from './application/processors/mail.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: (jwtConfiguration: ConfigType<typeof jwtConfig>) => ({
        secret: jwtConfiguration.secret,
        signOptions: {
          audience: jwtConfiguration.audience,
          issuer: jwtConfiguration.issuer,
          expiresIn: jwtConfiguration.accessTokenTtl,
        },
      }),
      inject: [jwtConfig.KEY],
    }),
    HashingModule,
    CaslModule,
    MailModule,
    UsersModule,
    BullModule.registerQueue({
      name: 'mail-queue',
    }),
    BullBoardModule.forFeature({
      name: 'mail-queue',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtStrategy,
    LocalStrategy,
    MailProcessor,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    ConfigModule,
    JwtModule,
    HashingModule,
    CaslModule,
    AuthenticationService,
    BullModule,
  ],
})
export class IamModule {}
