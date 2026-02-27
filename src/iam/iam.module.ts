import { forwardRef, Module } from '@nestjs/common';
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
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtStrategy,
    LocalStrategy,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    ConfigModule,
    JwtModule,
    HashingModule,
    CaslModule,
    AuthenticationService,
  ],
})
export class IamModule {}
