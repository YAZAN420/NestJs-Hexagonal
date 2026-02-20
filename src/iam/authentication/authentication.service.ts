import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
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

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UsersService,
    private readonly hashService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly cls: ClsService,
  ) {}
  async signUp(signUp: SignUpDto) {
    return await this.userService.create(signUp);
  }

  async signIn(signIn: SignInDto) {
    const user = await this.userService.findOneEmail(signIn.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await this.hashService.compare(
      signIn.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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

      return await this.generateTokens(user);
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
}
