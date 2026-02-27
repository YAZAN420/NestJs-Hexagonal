import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import jwtConfig from 'src/config/jwt.config';
import { ActiveUserData } from '../../../domain/interfaces/active-user-data.interface';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfiguration.secret!,
    });
  }

  validate(payload: ActiveUserData) {
    const user = { id: payload.id, email: payload.email, role: payload.role };
    this.cls.set('User', user);
    return user;
  }
}
