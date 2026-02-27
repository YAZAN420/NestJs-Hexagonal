import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Product } from 'src/products/infrastructure/persistence/mongoose/schemas/product.schema';
import { User } from 'src/users/domain/user';
import { Action } from '../../../domain/enums/action.enum';
import { Role } from 'src/users/domain/enums/role.enum';
import { ActiveUserData } from '../../../domain/interfaces/active-user-data.interface';

type Subjects = InferSubjects<typeof Product | typeof User> | 'all';
export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: ActiveUserData) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.Admin) {
      can(Action.Manage, 'all');
    } else {
      can(Action.Read, Product);
      can(Action.Create, Product);
      can(Action.Update, Product, { createdBy: user.id });
      can(Action.Delete, Product, { createdBy: user.id });
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
