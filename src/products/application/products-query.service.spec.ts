import { Test, TestingModule } from '@nestjs/testing';
import { ProductsQueryService } from './products-query.service';
import { ProductRepository } from 'src/products/application/ports/product.repository';
import { NotFoundException } from '@nestjs/common';
import { Product } from '../domain/product';
import { createMockProduct } from '../testing/product-builder';
import { GetProductByIdQuery } from './queries/get-product-by-id.query';

describe('ProductsQueryService', () => {
  let service: ProductsQueryService;

  const mockProductRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsQueryService,
        { provide: ProductRepository, useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<ProductsQueryService>(ProductsQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const expectedProducts = [
        createMockProduct({ id: '1' }),
        createMockProduct({ id: '2', name: 'Mouse', price: 10 }),
      ];
      mockProductRepo.findAll.mockResolvedValue(expectedProducts);

      const result = await service.findAll();

      expect(result).toEqual(expectedProducts);
      expect(mockProductRepo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    const productId = '1';
    let expectedProduct: Product;
    const query = new GetProductByIdQuery(productId);

    beforeEach(() => {
      expectedProduct = createMockProduct({ id: productId });
    });

    it('should return a product if it exists', async () => {
      mockProductRepo.findById.mockResolvedValue(expectedProduct);

      const result = await service.findOne(query);

      expect(result).toEqual(expectedProduct);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(query)).rejects.toThrow(NotFoundException);

      expect(mockProductRepo.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(1);
    });
  });
});
