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
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from 'src/products/application/products.service';
import { CreateProductCommand } from 'src/products/application/command/create-product.command';
import { UpdateProductCommand } from 'src/products/application/command/update-product.command';

@UseGuards(PoliciesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(
      new CreateProductCommand(
        createProductDto.name,
        createProductDto.description,
        createProductDto.price,
      ),
    );
    return {
      message: 'Product created successfully',
      data: product,
    };
  }
  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    return {
      message: 'Products fetched successfully',
      data: products,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const newProduct = await this.productsService.update(
      new UpdateProductCommand(
        id,
        updateProductDto.name,
        updateProductDto.description,
        updateProductDto.price,
      ),
    );
    return {
      message: 'Product updated successfully',
      data: newProduct,
    };
  }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return {
      message: 'Product deleted successfully',
    };
  }
}
