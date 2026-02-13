/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../decorators/roles.decorator';
import { Role } from 'src/users/enums/role.enum';
import { ActiveUserData } from 'src/iam/authentication/interfaces/active-user-data.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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

    const user: ActiveUserData = context.switchToHttp().getRequest().user;

    return contextRoles.some((role) => user.role === role);
  }
}
