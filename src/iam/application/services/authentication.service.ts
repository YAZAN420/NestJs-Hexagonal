import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwtConfig from 'src/config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActiveUserData } from '../../domain/interfaces/active-user-data.interface';
import { ClsService } from 'nestjs-cls';
import { OTP } from 'otplib';
import { toDataURL } from 'qrcode';
import * as crypto from 'crypto';
import { UsersService } from 'src/users/application/users.service';
import { CreateUserCommand } from 'src/users/application/commands/create-user.command';
import { User } from 'src/users/domain/user';
import { HashingPort } from '../ports/hashing.port';
import { SignUpDto } from 'src/iam/presentation/http/dto/sign-up.dto';
import { RefreshTokenDto } from 'src/iam/presentation/http/dto/refresh-token.dto';
import { MailPort } from 'src/shared/mail/application/ports/mail.port';
@Injectable()
export class AuthenticationService {
  private readonly otp = new OTP();
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly userService: UsersService,
    private readonly hashingPort: HashingPort,
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly mailPort: MailPort,
  ) {}
  async signUp(signUp: SignUpDto) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const command = new CreateUserCommand(
      signUp.username,
      signUp.email,
      signUp.password,
    );
    const newUser = await this.userService.create(command);

    newUser.setVerificationToken(verificationToken);
    await this.userService.save(newUser);

    this.mailPort
      .sendVerificationEmail(signUp.email, verificationToken)
      .catch((err) => console.error('Email Dispatch Failed:', err));
    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async signIn(user: User, tfaCode?: string) {
    if (!user.getIsEmailVerified()) {
      throw new UnauthorizedException(
        'Please verify your email before signing in',
      );
    }

    if (user.getIsTwoFactorAuthenticationEnabled()) {
      if (!tfaCode) {
        throw new ForbiddenException({
          requires2FA: true,
          message:
            'Please provide a two-factor authentication code to continue',
        });
      }
      const { valid } = await this.otp.verify({
        token: tfaCode,
        secret: user.getTwoFactorAuthenticationSecret()!,
      });
      if (!valid) {
        throw new UnauthorizedException(
          'Invalid two-factor authentication code',
        );
      }
    }

    const tokens = await this.generateTokens(user);

    return {
      user,
      tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);

    if (!user) return null;

    const isPasswordValid = await this.hashingPort.compare(
      password,
      user.getPasswordHash(),
    );
    if (!isPasswordValid) return null;
    return user;
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
      const user = await this.userService.findById(id);
      const isValid = await this.hashingPort.compare(
        refreshTokenDto.refreshToken,
        user.getRefreshToken() ?? '',
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
        user.getId(),
        this.jwtConfiguration.accessTokenTtl,
        { email: user.getEmailValue(), role: user.getRole() },
      ),
      this.signToken(user.getId(), this.jwtConfiguration.refreshTokenTtl),
    ]);

    const hashedRefreshToken = await this.hashingPort.hash(refreshToken);

    await this.userService.updateRefreshToken(user.getId(), hashedRefreshToken);

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
    const user = await this.userService.findById(userId);

    if (!user.getTwoFactorAuthenticationSecret()) {
      throw new UnauthorizedException(
        'Two-factor authentication secret is missing',
      );
    }

    const isCodeValid = await this.otp.verify({
      token: code,
      secret: user.getTwoFactorAuthenticationSecret()!,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Invalid two-factor authentication code');
    }

    user.enableTwoFactorAuth(user.getTwoFactorAuthenticationSecret()!);
    await this.userService.save(user);

    return { message: 'Two-factor authentication successfully enabled' };
  }

  async generateTwoFactorAuthenticationSecret(activeUser: ActiveUserData) {
    const user = await this.userService.findById(activeUser.id);
    if (!user) throw new UnauthorizedException();

    const secret = this.otp.generateSecret();
    const otpauthUrl = this.otp.generateURI({
      label: user.getEmailValue(),
      issuer: 'NestJS Course API',
      secret: secret,
    });

    user.setTwoFactorSecret(secret);
    await this.userService.save(user);

    return toDataURL(otpauthUrl);
  }

  async verifyEmail(token: string) {
    const user = await this.userService.findByVerificationToken(token);
    if (!user) throw new BadRequestException('Invalid token');
    user.verifyEmail(token);
    await this.userService.save(user);
    return { message: 'Email verified successfully.' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return { message: 'Password reset link sent to your email.' };
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    user.generatePasswordResetToken(resetToken, resetExpires);
    await this.userService.save(user);

    this.mailPort
      .sendPasswordResetEmail(user.getEmailValue(), resetToken)
      .catch((err) => console.error('Email Dispatch Failed:', err));

    return { message: 'Password reset link sent to your email.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }
    const hashedPassword = await this.hashingPort.hash(newPassword);

    user.resetPasswordWithToken(hashedPassword, token);
    await this.userService.save(user);

    return { message: 'Password has been reset successfully.' };
  }
}
