import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductCommand } from 'src/products/application/commands/create-product.command';
import { UpdateProductCommand } from 'src/products/application/commands/update-product.command';
import { CheckPolicies } from 'src/iam/presentation/http/decorators/check-policies.decorator';
import { Action } from 'src/iam/domain/enums/action.enum';
import { Product } from 'src/products/domain/product';
import type { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { CachePublic } from 'src/common/presentation/decorators/cache-public.decorator';
import { ActiveUser } from 'src/iam/presentation/http/decorators/active-user.decorator';
import { ProductsCommandService } from 'src/products/application/products-command.service';
import { ProductsQueryService } from 'src/products/application/products-query.service';
import { GetProductByIdQuery } from 'src/products/application/queries/get-product-by-id.query';
import { PageOptionsDto } from 'src/common/pagination/offset';
import { CursorPageOptionsDto } from 'src/common/pagination/cursor';

@UseGuards(PoliciesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsCommandService: ProductsCommandService,
    private readonly productsQueryService: ProductsQueryService,
  ) {}

  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Create, Product),
  ])
  @Post()
  async create(
    @ActiveUser() user: ActiveUserData,
    @Body() createProductDto: CreateProductDto,
  ) {
    const command = new CreateProductCommand(
      createProductDto.name,
      createProductDto.description,
      createProductDto.price,
    );
    const product = await this.productsCommandService.create(user, command);
    return {
      message: 'Product created successfully',
      data: product,
    };
  }
  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Read, Product),
  ])
  @Get()
  @CachePublic()
  async findAll(@Query() pageOptionsDto: PageOptionsDto) {
    const products = await this.productsQueryService.findAll(pageOptionsDto);
    return {
      message: 'Products fetched successfully',
      data: products.data,
      meta: products.meta,
    };
  }

  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Read, Product),
  ])
  @Get('cursor')
  @CachePublic()
  async findWithCursor(@Query() options: CursorPageOptionsDto) {
    const result = await this.productsQueryService.findAllCursor(options);

    return {
      message: 'Products fetched successfully (Cursor)',
      data: result.data,
      meta: result.meta,
    };
  }

  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Read, Product),
  ])
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const query = new GetProductByIdQuery(id);
    const product = await this.productsQueryService.findOne(query);
    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Update, Product),
  ])
  @Patch(':id')
  async update(
    @ActiveUser() user: ActiveUserData,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const newProduct = await this.productsCommandService.update(
      user,
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

  @CheckPolicies([
    (authPort, user) => authPort.checkPermission(user, Action.Delete, Product),
  ])
  @Delete(':id')
  async remove(@ActiveUser() user: ActiveUserData, @Param('id') id: string) {
    await this.productsCommandService.remove(user, id);
    return {
      message: 'Product deleted successfully',
    };
  }
}
