import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';

export interface IPolicyHandler {
  handle(authorizationPort: AuthorizationPort, user: ActiveUserData): boolean;
}

export type PolicyHandlerCallback = (
  authorizationPort: AuthorizationPort,
  user: ActiveUserData,
) => boolean;

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;
