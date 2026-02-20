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
import { Role } from 'src/users/enums/role.enum';
import { Roles } from 'src/iam/authorization/decorators/roles.decorator';
import { PoliciesGuard } from 'src/iam/authorization/guards/policies.guard';
import { CheckPolicies } from 'src/iam/authorization/decorators/check-policies.decorator';
import { Product } from './schemas/product.schema';
import { Action } from 'src/iam/authorization/enums/action.enum';

@UseGuards(PoliciesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }
  @CheckPolicies([(ability) => ability.can(Action.Read, Product)])
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Roles([Role.Admin])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
