import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserCommand } from 'src/users/application/commands/create-user.command';
import { UsersService } from 'src/users/application/users.service';
import { UpdateUserCommand } from 'src/users/application/commands/update-user.command';
import { UserResponseDto } from './dto/user-response.dto';
import type { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { ActiveUser } from 'src/iam/presentation/http/decorators/active-user.decorator';
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { CheckPolicies } from 'src/iam/presentation/http/decorators/check-policies.decorator';
import { User } from 'src/users/domain/user';
import { Action } from 'src/iam/domain/enums/action.enum';
import { CachePort } from 'src/common/application/ports/cache.port';

@UseGuards(PoliciesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cachePort: CachePort,
  ) {}

  @Post()
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Create, User),
  ])
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
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Read, User),
  ])
  async findAll() {
    const users = await this.usersService.findAll();
    const data = users.map((user) => UserResponseDto.fromEntity(user));
    return { message: 'Users retrieved successfully', data: data };
  }

  @Get('me')
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Read, User),
  ])
  async getMe(@ActiveUser() activeUser: ActiveUserData) {
    const user = await this.usersService.findById(activeUser.id);
    return {
      message: 'User profile retrieved successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Get(':id')
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Read, User),
  ])
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return {
      message: 'User retrieved successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Patch(':id')
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Update, User),
  ])
  async update(
    @ActiveUser() activeUser: ActiveUserData,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateProfile(
      activeUser,
      new UpdateUserCommand(id, updateUserDto.username),
    );

    return {
      message: 'Users updated successfully',
      data: UserResponseDto.fromEntity(user),
    };
  }

  @Delete(':id')
  @CheckPolicies([
    (authPort: AuthorizationPort, user: ActiveUserData) =>
      authPort.checkPermission(user, Action.Delete, User),
  ])
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
