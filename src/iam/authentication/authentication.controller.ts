import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Res,
  Inject,
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
  signOut(@ActiveUser() user: ActiveUserData) {
    return this.authService.signOut(user.id);
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
}
