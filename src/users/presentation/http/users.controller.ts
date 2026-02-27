import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserCommand } from 'src/users/application/commands/create-user.command';
import { UsersService } from 'src/users/application/users.service';
import { UpdateUserCommand } from 'src/users/application/commands/update-user.command';
import { UserResponseDto } from './dto/user-response.dto';
import type { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { ActiveUser } from 'src/iam/presentation/http/decorators/active-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(
      new CreateUserCommand(
        createUserDto.username,
        createUserDto.email,
        createUserDto.password,
      ),
    );
    return {
      message: 'User created successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    const data = users.map((user) => UserResponseDto.fromEntity(user));
    return { message: 'Users retrieved successfully', data: data };
  }

  @Get('me')
  async getMe(@ActiveUser() activeUser: ActiveUserData) {
    const user = await this.usersService.findById(activeUser.id);
    return {
      message: 'User profile retrieved successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      message: 'User retrieved successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.updateProfile(
      new UpdateUserCommand(id, updateUserDto.username),
    );
    return {
      message: 'Users updated successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
