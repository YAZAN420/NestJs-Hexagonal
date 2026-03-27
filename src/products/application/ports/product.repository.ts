import {
  CursorPageDto,
  CursorPageOptionsDto,
} from 'src/common/pagination/cursor';
import { PageDto, PageOptionsDto } from 'src/common/pagination/offset';
import { Product } from 'src/products/domain/product';

export abstract class ProductRepository {
  abstract findAll(options: PageOptionsDto): Promise<PageDto<Product>>;
  abstract findAllCursor(
    options: CursorPageOptionsDto,
  ): Promise<CursorPageDto<Product>>;

  abstract save(product: Product): Promise<void>;
  abstract delete(id: string): Promise<void>;

  abstract findById(id: string): Promise<Product | null>;
}
