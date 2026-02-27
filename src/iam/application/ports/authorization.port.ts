import { Injectable } from '@nestjs/common';
import { Action } from 'src/iam/domain/enums/action.enum';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';

@Injectable()
export abstract class AuthorizationPort {
  abstract checkPermission(
    user: ActiveUserData,
    action: Action,
    subject: any,
  ): boolean;
}
