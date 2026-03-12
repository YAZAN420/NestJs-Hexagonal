import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { UsersController } from './presentation/http/users.controller';
import { HashingModule } from 'src/iam/infrastructure/hashing/hashing.module';
import { CaslModule } from 'src/iam/infrastructure/authorization/casl/casl.module';
import { UserFactory } from './domain/factories/user.factory';
import { UsersQueryService } from './application/users-query.service';
import { UsersCommandService } from './application/users-command.service';

@Global()
@Module({
  imports: [HashingModule, CaslModule],
  controllers: [UsersController],
  providers: [UsersQueryService, UsersCommandService, UserFactory],
  exports: [UsersQueryService, UsersCommandService, UserFactory],
})
export class UsersModule {
  static withInfrastructure(infrastuctureModule: Type | DynamicModule) {
    return {
      module: UsersModule,
      imports: [infrastuctureModule],
      exports: [infrastuctureModule],
    };
  }
}
