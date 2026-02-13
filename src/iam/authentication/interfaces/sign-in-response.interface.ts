import { UserEntity } from 'src/users/entities/user.entity';

export interface SignInResponse {
  user: UserEntity;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
