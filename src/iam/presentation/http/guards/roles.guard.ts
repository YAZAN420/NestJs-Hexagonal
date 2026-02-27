import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../decorators/roles.decorator';
import { Role } from 'src/users/domain/enums/role.enum';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const contextRoles = this.reflector.getAllAndOverride<Role[]>(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!contextRoles) {
      return true;
    }

    const user = this.cls.get<ActiveUserData>('User');

    if (!user) {
      return false;
    }

    if (!user) {
      return false;
    }

    return contextRoles.some((role) => user.role === role);
  }
}
