import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from 'src/products/application/products.service';
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { createMockProduct } from 'src/products/testing/product-builder';
import { createMockUser } from 'src/users/testing/user-builder';
import { UpdateProductCommand } from 'src/products/application/command/update-product.command';
import { CreateProductCommand } from 'src/products/application/command/create-product.command';

describe('ProductsController', () => {
  let controller: ProductsController;
  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
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
    it('should return an array of products', async () => {
      const expectedProducts = [
        createMockProduct({ id: '1', name: 'Product A', price: 100 }),
        createMockProduct({ id: '2', name: 'Product B', price: 200 }),
      ];
      mockProductsService.findAll.mockResolvedValue(expectedProducts);
      const result = await controller.findAll();
      expect(mockProductsService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Products fetched successfully',
        data: expectedProducts,
      });
    });
    it('should return an empty array if no products exist', async () => {
      mockProductsService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(mockProductsService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Products fetched successfully',
        data: [],
      });
    });
    it('should throw an error if productsService.findAll throws an error', async () => {
      const error = new Error('Database connection failed');
      mockProductsService.findAll.mockRejectedValue(error);
      const result = controller.findAll();
      await expect(result).rejects.toThrow(error);
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const expectedProduct = createMockProduct({
      id: '1',
      name: 'Product A',
      price: 100,
    });
    it('should return a single product by id', async () => {
      mockProductsService.findOne.mockResolvedValue(expectedProduct);
      const result = await controller.findOne(expectedProduct.getId());
      expect(mockProductsService.findOne).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Product fetched successfully',
        data: expectedProduct,
      });
    });
    it('should throw an error if productsService.findOne throws an error', async () => {
      const productId = '999';
      const error = new Error('Database connection failed');
      mockProductsService.findOne.mockRejectedValue(error);
      const result = controller.findOne(productId);
      await expect(result).rejects.toThrow(error);
      expect(mockProductsService.findOne).toHaveBeenCalled();
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
      mockProductsService.update.mockResolvedValue(expectedUpdatedProduct);
      const result = await controller.update(mockUser, productId, updateDto);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        mockUser,
        expect.any(UpdateProductCommand),
      );
      const callArgs = mockProductsService.update.mock.calls[0] as [
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
    it('should throw an error if productsService.update throws', async () => {
      const mockUser = createMockUser();
      const productId = '999';
      const updateDto = { price: 200 };
      const error = new Error('Update failed');

      mockProductsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockUser, productId, updateDto),
      ).rejects.toThrow(error);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        mockUser,
        expect.any(UpdateProductCommand),
      );
    });
    it('should update a product partially (e.g., only price)', async () => {
      const mockUser = createMockUser();
      const productId = '1';
      const partialUpdateDto = { price: 300 };

      const expectedUpdatedProduct = createMockProduct({
        id: productId,
        name: 'Old Name',
        description: 'Old Description',
        price: partialUpdateDto.price,
      });
      mockProductsService.update.mockResolvedValue(expectedUpdatedProduct);
      const result = await controller.update(
        mockUser,
        productId,
        partialUpdateDto,
      );
      const callArgs = mockProductsService.update.mock.calls[0] as [
        any,
        UpdateProductCommand,
      ];
      const calledCommand = callArgs[1];
      expect(calledCommand.id).toEqual(productId);
      expect(calledCommand.price).toEqual(partialUpdateDto.price);
      expect(calledCommand.name).toBeUndefined();
      expect(calledCommand.description).toBeUndefined();
      expect(result).toEqual({
        message: 'Product updated successfully',
        data: expectedUpdatedProduct,
      });
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

      mockProductsService.create.mockResolvedValue(expectedProduct);

      const result = await controller.create(mockUser, createDto);

      expect(mockProductsService.create).toHaveBeenCalledWith(
        mockUser,
        expect.any(CreateProductCommand),
      );

      const callArgs = mockProductsService.create.mock.calls[0] as [
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

    it('should throw an error if productsService.create throws', async () => {
      const mockUser = createMockUser();
      const createDto = {
        name: 'New Product',
        description: 'New Description',
        price: 300,
      };
      const error = new Error('Creation failed');

      mockProductsService.create.mockRejectedValue(error);

      await expect(controller.create(mockUser, createDto)).rejects.toThrow(
        error,
      );
      expect(mockProductsService.create).toHaveBeenCalled();
    });
  });
  describe('remove', () => {
    it('should delete a product successfully', async () => {
      const mockUser = createMockUser();
      const productId = '1';

      mockProductsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser, productId);

      expect(mockProductsService.remove).toHaveBeenCalledWith(
        mockUser,
        productId,
      );

      expect(result).toEqual({
        message: 'Product deleted successfully',
      });
    });

    it('should throw an error if productsService.remove throws', async () => {
      const mockUser = createMockUser();
      const productId = '999';
      const error = new Error('Deletion failed');

      mockProductsService.remove.mockRejectedValue(error);

      await expect(controller.remove(mockUser, productId)).rejects.toThrow(
        error,
      );
      expect(mockProductsService.remove).toHaveBeenCalledWith(
        mockUser,
        productId,
      );
    });
  });
});
