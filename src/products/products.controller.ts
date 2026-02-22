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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PoliciesGuard } from 'src/iam/authorization/guards/policies.guard';
import { CheckPolicies } from 'src/iam/authorization/decorators/check-policies.decorator';
import { Product } from './schemas/product.schema';
import { Action } from 'src/iam/authorization/enums/action.enum';

@UseGuards(PoliciesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @CheckPolicies([(ability) => ability.can(Action.Create, Product)])
  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      message: 'Product created successfully',
      data: product,
    };
  }
  @CheckPolicies([(ability) => ability.can(Action.Read, Product)])
  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return {
      message: 'Products fetched successfully',
      data: products,
    };
  }

  @CheckPolicies([(ability) => ability.can(Action.Read, Product)])
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  @CheckPolicies([(ability) => ability.can(Action.Update, Product)])
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const newProduct = await this.productsService.update(id, updateProductDto);
    return {
      message: 'Product updated successfully',
      data: newProduct,
    };
  }
  @CheckPolicies([(ability) => ability.can(Action.Delete, Product)])
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return {
      message: 'Product deleted successfully',
    };
  }
}
