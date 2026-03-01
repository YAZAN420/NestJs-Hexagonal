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
  Req,
} from '@nestjs/common';
import { AuthenticationService } from '../../application/services/authentication.service';
import { Public } from './decorators/public.decorator';
import { ActiveUser } from './decorators/active-user.decorator';
import type { ActiveUserData } from '../../domain/interfaces/active-user-data.interface';
import { SignInResponse } from './interfaces/sign-in-response.interface';
import jwtConfig from 'src/config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  AuthRefreshTokens,
  AuthSignIn,
  AuthSignUp,
  AuthTurnOn2FA,
} from './decorators/authentication.decorators';
import { User } from 'src/users/domain/user';
import { UserResponseDto } from 'src/users/presentation/http/dto/user-response.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authService: AuthenticationService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  @AuthSignUp()
  signUp(@Body() signUp: SignUpDto) {
    return this.authService.signUp(signUp);
  }
  @AuthSignIn()
  async signIn(
    @Req() request: Request,
    @Body() signIn: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result: SignInResponse = await this.authService.signIn(
      request.user as User,
      signIn.tfaCode,
    );
    response.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: this.jwtConfiguration.cookieSecure,
      sameSite: 'strict',
      maxAge: this.jwtConfiguration.cookieMaxAge,
    });
    return {
      message: 'User signed in successfully',
      data: {
        user: UserResponseDto.fromEntity(result.user),
        accessToken: result.tokens.accessToken,
      },
    };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  signOut(@ActiveUser() user: ActiveUserData) {
    return this.authService.signOut(user.id);
  }

  @AuthRefreshTokens()
  refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('2fa/generate')
  async generateQrCode(@ActiveUser() user: ActiveUserData) {
    const qrCodeDataUrl =
      await this.authService.generateTwoFactorAuthenticationSecret(user);
    return { data: { qrCode: qrCodeDataUrl } };
  }

  @AuthTurnOn2FA()
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
