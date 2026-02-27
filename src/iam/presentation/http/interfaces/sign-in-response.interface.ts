import { User } from 'src/users/domain/user';

export interface SignInResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
