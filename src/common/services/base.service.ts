import { Injectable, NotFoundException } from '@nestjs/common';
import { Document, Model, UpdateQuery } from 'mongoose';
import { accessibleBy } from '@casl/mongoose';
import { CaslAbilityFactory } from 'src/iam/authorization/casl/casl-ability.factory';
import { Action } from 'src/iam/authorization/enums/action.enum';

@Injectable()
export class BaseService<T extends Document> {
  constructor(
    protected readonly model: Model<T>,
    protected readonly abilityFactory: CaslAbilityFactory,
  ) {}

  async findAll() {
    const ability = this.getAbility();
    const conditions = accessibleBy(ability, Action.Read);
    return await this.model.find(conditions).lean().exec();
  }

  async findOne(id: string) {
    const ability = this.getAbility();

    const doc = await this.model
      .findOne({
        _id: id,
        ...accessibleBy(ability, Action.Update),
      })
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(
        'Document not found or you do not have permission to read it',
      );
    }
    return doc;
  }

  async update(id: string, updateDto: UpdateQuery<T>) {
    const ability = this.getAbility();

    const updatedDoc = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          ...accessibleBy(ability, Action.Update),
        },
        updateDto,
        { new: true },
      )
      .lean()
      .exec();

    if (!updatedDoc) {
      throw new NotFoundException(
        'Document not found or you do not have permission to update it',
      );
    }
    return updatedDoc;
  }

  async remove(id: string) {
    const ability = this.getAbility();

    const deletedDoc = await this.model
      .findOneAndDelete({
        _id: id,
        ...accessibleBy(ability, Action.Update),
      })
      .lean()
      .exec();

    if (!deletedDoc) {
      throw new NotFoundException(
        'Document not found or you do not have permission to delete it',
      );
    }
    return { message: 'Document deleted successfully' };
  }
  protected getAbility() {
    return this.abilityFactory.createForUser();
  }
}
