/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Expose, Transform } from 'class-transformer';
import { Role } from '../enums/role.enum';

export class UserEntity {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;
  @Expose()
  username: string;
  @Expose()
  email: string;
  @Expose()
  createdAt: Date;
  @Expose()
  updatedAt: Date;
  @Expose()
  role: Role;
}
