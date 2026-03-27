import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { createMockProduct } from 'src/products/testing/product-builder';
import { createMockUser } from 'src/users/testing/user-builder';
import { UpdateProductCommand } from 'src/products/application/commands/update-product.command';
import { CreateProductCommand } from 'src/products/application/commands/create-product.command';
import { ProductsCommandService } from 'src/products/application/products-command.service';
import { ProductsQueryService } from 'src/products/application/products-query.service';
import { GetProductByIdQuery } from 'src/products/application/queries/get-product-by-id.query';
import { PageOptionsDto } from 'src/common/pagination/offset';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsCommandService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductsQueryService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsCommandService,
          useValue: mockProductsCommandService,
        },
        {
          provide: ProductsQueryService,
          useValue: mockProductsQueryService,
        },
      ],
    })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockPageOptions = new PageOptionsDto();

    const mockMeta = {
      page: 1,
      take: 10,
      itemCount: 2,
      pageCount: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
    it('should return a paginated list of products', async () => {
      const expectedProducts = [
        createMockProduct({ id: '1', name: 'Product A', price: 100 }),
        createMockProduct({ id: '2', name: 'Product B', price: 200 }),
      ];
      mockProductsQueryService.findAll.mockResolvedValue({
        data: expectedProducts,
        meta: mockMeta,
      });

      const result = await controller.findAll(mockPageOptions);

      expect(mockProductsQueryService.findAll).toHaveBeenCalledWith(
        mockPageOptions,
      );
      expect(result).toEqual({
        message: 'Products fetched successfully',
        data: expectedProducts,
        meta: mockMeta,
      });
    });

    it('should return an empty paginated list if no products exist', async () => {
      mockProductsQueryService.findAll.mockResolvedValue({
        data: [],
        meta: { ...mockMeta, itemCount: 0 },
      });
      const result = await controller.findAll(mockPageOptions);

      expect(mockProductsQueryService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Products fetched successfully',
        data: [],
        meta: { ...mockMeta, itemCount: 0 },
      });
    });

    it('should throw an error if productsQueryService.findAll throws an error', async () => {
      const error = new Error('Database connection failed');
      mockProductsQueryService.findAll.mockRejectedValue(error);

      const result = controller.findAll(mockPageOptions);

      await expect(result).rejects.toThrow(error);
      expect(mockProductsQueryService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const expectedProduct = createMockProduct({
      id: '1',
      name: 'Product A',
      price: 100,
    });

    it('should return a single product by id', async () => {
      mockProductsQueryService.findOne.mockResolvedValue(expectedProduct);

      const result = await controller.findOne(expectedProduct.getId());

      expect(mockProductsQueryService.findOne).toHaveBeenCalledWith(
        expect.any(GetProductByIdQuery),
      );
      expect(result).toEqual({
        message: 'Product fetched successfully',
        data: expectedProduct,
      });
    });

    it('should throw an error if productsQueryService.findOne throws an error', async () => {
      const productId = '999';
      const error = new Error('Database connection failed');
      mockProductsQueryService.findOne.mockRejectedValue(error);

      const result = controller.findOne(productId);

      await expect(result).rejects.toThrow(error);
      expect(mockProductsQueryService.findOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const mockUser = createMockUser();
      const productId = '1';
      const updateDto = {
        name: 'Updated Product Name',
        description: 'Updated Description',
        price: 150,
      };
      const expectedUpdatedProduct = { id: productId, ...updateDto };

      mockProductsCommandService.update.mockResolvedValue(
        expectedUpdatedProduct,
      );

      const result = await controller.update(mockUser, productId, updateDto);

      expect(mockProductsCommandService.update).toHaveBeenCalledWith(
        mockUser,
        expect.any(UpdateProductCommand),
      );

      const callArgs = mockProductsCommandService.update.mock.calls[0] as [
        any,
        UpdateProductCommand,
      ];
      const calledCommand = callArgs[1];
      expect(calledCommand.id).toEqual(productId);
      expect(calledCommand.name).toEqual(updateDto.name);
      expect(calledCommand.price).toEqual(updateDto.price);
      expect(calledCommand.description).toEqual(updateDto.description);
      expect(result).toEqual({
        message: 'Product updated successfully',
        data: expectedUpdatedProduct,
      });
    });

    it('should throw an error if productsCommandService.update throws', async () => {
      const mockUser = createMockUser();
      const productId = '999';
      const updateDto = { price: 200 };
      const error = new Error('Update failed');

      mockProductsCommandService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockUser, productId, updateDto),
      ).rejects.toThrow(error);

      expect(mockProductsCommandService.update).toHaveBeenCalledWith(
        mockUser,
        expect.any(UpdateProductCommand),
      );
    });
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const mockUser = createMockUser();
      const createDto = {
        name: 'New Product',
        description: 'New Description',
        price: 300,
      };
      const expectedProduct = createMockProduct({ id: '1', ...createDto });

      mockProductsCommandService.create.mockResolvedValue(expectedProduct);

      const result = await controller.create(mockUser, createDto);

      expect(mockProductsCommandService.create).toHaveBeenCalledWith(
        mockUser,
        expect.any(CreateProductCommand),
      );

      const callArgs = mockProductsCommandService.create.mock.calls[0] as [
        any,
        CreateProductCommand,
      ];
      const calledCommand = callArgs[1];

      expect(calledCommand.name).toEqual(createDto.name);
      expect(calledCommand.description).toEqual(createDto.description);
      expect(calledCommand.price).toEqual(createDto.price);

      expect(result).toEqual({
        message: 'Product created successfully',
        data: expectedProduct,
      });
    });

    it('should throw an error if productsCommandService.create throws', async () => {
      const mockUser = createMockUser();
      const createDto = {
        name: 'New Product',
        description: 'New Description',
        price: 300,
      };
      const error = new Error('Creation failed');

      mockProductsCommandService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createDto)).rejects.toThrow(
        error,
      );
      expect(mockProductsCommandService.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a product successfully', async () => {
      const mockUser = createMockUser();
      const productId = '1';

      mockProductsCommandService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser, productId);

      expect(mockProductsCommandService.remove).toHaveBeenCalledWith(
        mockUser,
        productId,
      );

      expect(result).toEqual({
        message: 'Product deleted successfully',
      });
    });

    it('should throw an error if productsCommandService.remove throws', async () => {
      const mockUser = createMockUser();
      const productId = '999';
      const error = new Error('Deletion failed');

      mockProductsCommandService.remove.mockRejectedValue(error);

      await expect(controller.remove(mockUser, productId)).rejects.toThrow(
        error,
      );
      expect(mockProductsCommandService.remove).toHaveBeenCalledWith(
        mockUser,
        productId,
      );
    });
  });
});
