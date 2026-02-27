import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/users/presentation/http/dto/create-user.dto';

export class SignUpDto extends PickType(CreateUserDto, [
  'username',
  'email',
  'password',
] as const) {}
