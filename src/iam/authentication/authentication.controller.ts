import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Res,
  Inject,
  Query,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from './decorators/public.decorator';
import { ActiveUser } from './decorators/active-user.decorator';
import type { ActiveUserData } from './interfaces/active-user-data.interface';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { Response } from 'express';
import { SignInResponse } from './interfaces/sign-in-response.interface';
import jwtConfig from 'src/config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  @Public()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  signUp(@Body() signUp: SignUpDto) {
    return this.authService.signUp(signUp);
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signIn: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result: SignInResponse = await this.authService.signIn(signIn);

    response.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: this.jwtConfiguration.cookieSecure,
      sameSite: 'strict',
      maxAge: this.jwtConfiguration.cookieMaxAge,
    });
    return {
      message: 'User signed in successfully',
      user: result.user,
      accessToken: result.tokens.accessToken,
    };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  signOut() {
    return this.authService.signOut();
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  getMe(@ActiveUser() user: ActiveUserData) {
    return user;
  }

  @Public()
  @Post('refresh-tokens')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('2fa/generate')
  async generateQrCode(@ActiveUser() user: ActiveUserData) {
    const qrCodeDataUrl =
      await this.authService.generateTwoFactorAuthenticationSecret(user);
    return { qrCode: qrCodeDataUrl };
  }

  @Post('2fa/turn-on')
  @HttpCode(HttpStatus.OK)
  async turnOnTwoFactorAuthentication(
    @ActiveUser() user: ActiveUserData,
    @Body('tfaCode') tfaCode: string,
  ) {
    return this.authService.turnOnTwoFactorAuthentication(user.id, tfaCode);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body('password') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }
}
