import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { ProductRepository } from 'src/products/application/ports/product.repository';
import { Product } from 'src/products/domain/product';
import { ProductMapper } from '../mappers/product.mapper';
import { Product as MongoProduct } from '../schemas/product.schema';
import { ClsService } from 'nestjs-cls';
import { AppClsStore } from 'src/common/interfaces/app-cls-store.interface';
import { CLS_KEYS } from 'src/common/constants/cls-keys.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MongooseProductRepository implements ProductRepository {
  constructor(
    @InjectModel(MongoProduct.name)
    private readonly productModel: Model<MongoProduct>,
    private readonly productMapper: ProductMapper,
    private readonly cls: ClsService<AppClsStore>,
  ) {}
  private get session(): ClientSession | null {
    return this.cls.get<ClientSession>(CLS_KEYS.MONGO_SESSION);
  }
  async findAll(): Promise<Product[]> {
    const docs = await this.productModel.find().session(this.session).exec();
    return docs.map((doc) => this.productMapper.toDomain(doc));
  }
  async save(product: Product): Promise<void> {
    const persistenceData = this.productMapper.toPersistence(product);
    await this.productModel
      .findOneAndUpdate(
        { _id: product.getId() },
        { $set: persistenceData },
        { upsert: true, returnDocument: 'after' },
      )
      .session(this.session)
      .exec();
  }
  async delete(id: string): Promise<void> {
    await this.productModel.findByIdAndDelete(id).session(this.session).exec();
  }
  async findById(id: string): Promise<Product | null> {
    const doc = await this.productModel
      .findById(id)
      .session(this.session)
      .exec();
    if (!doc) return null;
    return this.productMapper.toDomain(doc);
  }
}
