import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from 'src/users/application/ports/user.repository';
import { UserFactory } from 'src/users/domain/factories/user.factory';
import { User } from 'src/users/domain/user';
import { CreateUserCommand } from 'src/users/application/commands/create-user.command';
import { UpdateUserCommand } from './commands/update-user.command';
import { HashingPort } from 'src/iam/application/ports/hashing.port';
import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { Action } from 'src/iam/domain/enums/action.enum';
import { CachePort } from 'src/common/application/ports/cache.port';

@Injectable()
export class UsersCommandService {
  constructor(
    private readonly hashService: HashingPort,
    private readonly userRepository: UserRepository,
    private readonly userFactory: UserFactory,
    private readonly authPort: AuthorizationPort,
    private readonly cachePort: CachePort,
  ) {}

  async create(command: CreateUserCommand): Promise<User> {
    const emailExists = await this.userRepository.findByEmail(command.email);
    if (emailExists) throw new ConflictException('Email already exists');

    const usernameExists = await this.userRepository.findByUsername(
      command.username,
    );
    if (usernameExists) throw new ConflictException('Username already exists');

    const hashedPassword = await this.hashService.hash(command.password);

    const newUser = this.userFactory.createNew(
      command.username,
      command.email,
      hashedPassword,
    );

    await this.userRepository.save(newUser);

    await this.cachePort.delete('GET:/users');

    return newUser;
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.delete(id);
    return { message: 'User deleted successfully' };
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.updateRefreshToken(refreshToken);
    await this.userRepository.save(user);
  }

  async updateProfile(
    activeUser: ActiveUserData,
    command: UpdateUserCommand,
  ): Promise<User> {
    const user = await this.userRepository.findById(command.id);
    if (!user) throw new NotFoundException('User not found');

    const isAllowed = this.authPort.checkPermission(
      activeUser,
      Action.Update,
      User,
    );
    if (!isAllowed) {
      throw new ForbiddenException('You can only update your own profile!');
    }
    if (command.username) {
      const existingUser = await this.userRepository.findByUsername(
        command.username,
      );
      if (existingUser && existingUser.getId() !== user.getId()) {
        throw new ConflictException('Username is already taken');
      }
      user.changeUsername(command.username);
    }
    await this.userRepository.save(user);

    await this.cachePort.delete('GET:/users');
    await this.cachePort.delete(`GET:/users/me:${activeUser.id}`);
    await this.cachePort.delete(`GET:/users/${user.getId()}`);

    return user;
  }

  async verifyUserEmail(token: string): Promise<void> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) throw new NotFoundException('Invalid verification token');

    user.verifyEmail(token);
    await this.userRepository.save(user);
  }

  async save(user: User): Promise<void> {
    await this.userRepository.save(user);
  }
}
