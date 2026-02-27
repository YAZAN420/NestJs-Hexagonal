import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/http/users.controller';
import { HashingModule } from 'src/iam/infrastructure/hashing/hashing.module';
import { CaslModule } from 'src/iam/infrastructure/authorization/casl/casl.module';
import { UserFactory } from './domain/factories/user.factory';

@Global()
@Module({
  imports: [HashingModule, CaslModule],
  controllers: [UsersController],
  providers: [UsersService, UserFactory],
  exports: [UsersService, UserFactory],
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
