import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { UsersService } from 'src/users/users.service';
import { HashingService } from '../hashing/hashing.service';
import jwtConfig from 'src/config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActiveUserData } from './interfaces/active-user-data.interface';
import { User } from 'src/users/schemas/user.schema';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { ClsService } from 'nestjs-cls';
import { OTP } from 'otplib';
import { toDataURL } from 'qrcode';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthenticationService {
  private readonly otp = new OTP();
  constructor(
    private readonly userService: UsersService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly cls: ClsService,
    private readonly mailService: MailService,
  ) {}
  async signUp(signUp: SignUpDto) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.userService.create({
      ...signUp,
      emailVerificationToken: verificationToken,
    });

    this.mailService
      .sendVerificationEmail(signUp.email, verificationToken)
      .catch((err) => console.error('Email Dispatch Failed:', err));
    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findOneEmail(email);
    if (!user) return null;

    const isPasswordValid = await this.hashService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) return null;
    return user;
  }

  async signIn(user: User, tfaCode?: string) {
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in',
      );
    }

    if (user.isTwoFactorAuthenticationEnabled) {
      if (!tfaCode) {
        throw new ForbiddenException({
          requires2FA: true,
          message:
            'Please provide a two-factor authentication code to continue',
        });
      }

      const isCodeValid = await this.otp.verify({
        token: tfaCode,
        secret: user.twoFactorAuthenticationSecret!,
      });

      if (!isCodeValid) {
        throw new UnauthorizedException(
          'Invalid two-factor authentication code',
        );
      }
    }

    const tokens = await this.generateTokens(user);
    const userEntity = plainToInstance(UserEntity, user.toObject(), {
      excludeExtraneousValues: true,
    });
    return {
      user: userEntity,
      tokens,
    };
  }
  async signOut() {
    const id: string = this.cls.get<ActiveUserData>('User').id;
    await this.userService.updateRefreshToken(id, null);
    return { message: 'User signed out successfully' };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const { id } = await this.jwtService.verifyAsync<{ id: string }>(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

      const user = await this.userService.findOneWithRefreshToken(id);

      const isValid = await this.hashService.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken ?? '',
      );

      if (!isValid) {
        throw new UnauthorizedException('Access Denied');
      }

      return { data: await this.generateTokens(user) };
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException('Access Denied');
    }
  }
  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Partial<ActiveUserData>>(
        user._id.toString(),
        this.jwtConfiguration.accessTokenTtl,
        { email: user.email, role: user.role },
      ),
      this.signToken(
        user._id.toString(),
        this.jwtConfiguration.refreshTokenTtl,
      ),
    ]);

    const hashedRefreshToken = await this.hashService.hash(refreshToken);

    await this.userService.updateRefreshToken(
      user._id.toString(),
      hashedRefreshToken,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
  private async signToken<T>(userId: string, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        id: userId,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn,
      },
    );
  }

  async turnOnTwoFactorAuthentication(userId: string, code: string) {
    const user = await this.userService.findOneWithTfaSecret(userId);

    if (!user.twoFactorAuthenticationSecret) {
      throw new UnauthorizedException(
        'Two-factor authentication secret is missing',
      );
    }

    const isCodeValid = await this.otp.verify({
      token: code,
      secret: user.twoFactorAuthenticationSecret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    await this.userService.updateInternal(userId, {
      isTwoFactorAuthenticationEnabled: true,
    });

    return { message: 'Two-factor authentication successfully enabled' };
  }

  async generateTwoFactorAuthenticationSecret(user: ActiveUserData) {
    const secret = this.otp.generateSecret();

    const otpauthUrl = this.otp.generateURI({
      label: user.email,
      issuer: 'NestJS Course API',
      secret: secret,
    });

    await this.userService.updateInternal(user.id, {
      twoFactorAuthenticationSecret: secret,
    });

    return toDataURL(otpauthUrl);
  }

  async verifyEmail(token: string) {
    const user = await this.userService.findByVerificationToken(token);
    await this.userService.updateInternal(user._id.toString(), {
      isEmailVerified: true,
      emailVerificationToken: undefined,
    });
    return { message: 'Email verified successfully.' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findOneEmail(email);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    await this.userService.updateInternal(user._id.toString(), {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    this.mailService
      .sendPasswordResetEmail(user.email, resetToken)
      .catch((err) => console.error('Email Dispatch Failed:', err));

    return { message: 'Password reset link sent to your email.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findByResetToken(token);

    if (!user || user.passwordResetExpires! < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await this.hashService.hash(newPassword);
    await this.userService.updateInternal(user._id.toString(), {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    return { message: 'Password has been reset successfully.' };
  }
}
