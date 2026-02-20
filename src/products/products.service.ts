import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ClsService } from 'nestjs-cls';
import { ActiveUserData } from 'src/iam/authentication/interfaces/active-user-data.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CaslAbilityFactory } from 'src/iam/authorization/casl/casl-ability.factory';
import { BaseService } from 'src/common/services/base.service';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService extends BaseService<Product> {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    protected readonly abilityFactory: CaslAbilityFactory,
    private readonly cls: ClsService,
  ) {
    super(productModel, abilityFactory);
  }
  create(createProductDto: CreateProductDto): Promise<Product> {
    const user = this.cls.get<ActiveUserData>('User');

    const newProduct = new this.productModel({
      ...createProductDto,
      createdBy: user.id,
    });

    return newProduct.save();
  }
  async update(id: string, dto: UpdateProductDto) {
    return super.update(id, { $set: dto });
  }
}
