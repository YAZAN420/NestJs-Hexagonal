import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../domain/user';
import { UserRepository } from './ports/user.repository';
import { GetUserByIdQuery } from './queries/get-user-by-id.query';
import { GetUserByEmailQuery } from './queries/get-user-by-email.query';

@Injectable()
export class UsersQueryService {
  constructor(private readonly userRepository: UserRepository) {}
  async findById(query: GetUserByIdQuery): Promise<User> {
    const user = await this.userRepository.findById(query.id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.findAll();
    return users;
  }

  async findByEmail(query: GetUserByEmailQuery): Promise<User | null> {
    return this.userRepository.findByEmail(query.email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findByVerificationToken(token);
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findByResetToken(token);
  }
}
