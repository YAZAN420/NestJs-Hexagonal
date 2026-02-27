import { Injectable } from '@nestjs/common';
import { AuthorizationPort } from '../../../application/ports/authorization.port';
import { ActiveUserData } from '../../../domain/interfaces/active-user-data.interface';
import { Action } from '../../../domain/enums/action.enum';
import { CaslAbilityFactory } from './casl-ability.factory';

@Injectable()
export class CaslAdapter implements AuthorizationPort {
  constructor(private readonly caslFactory: CaslAbilityFactory) {}

  checkPermission(user: ActiveUserData, action: Action, subject: any): boolean {
    const ability = this.caslFactory.createForUser(user);
    return ability.can(action, subject);
  }
}
