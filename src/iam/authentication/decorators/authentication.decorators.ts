import {
  applyDecorators,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { Public } from './public.decorator';

export function AuthSignIn() {
  return applyDecorators(
    Public(),
    Post('sign-in'),
    HttpCode(HttpStatus.OK),
    UseGuards(LocalAuthGuard),
    Throttle({ default: { limit: 5, ttl: 60000 } }),
  );
}

export function AuthSignUp() {
  return applyDecorators(
    Public(),
    Post('sign-up'),
    HttpCode(HttpStatus.CREATED),
  );
}

export function AuthRefreshTokens() {
  return applyDecorators(
    Public(),
    Post('refresh-tokens'),
    HttpCode(HttpStatus.OK),
  );
}

export function AuthGetMe() {
  return applyDecorators(Get('me'));
}

export function AuthTurnOn2FA() {
  return applyDecorators(Post('2fa/turn-on'), HttpCode(HttpStatus.OK));
}
