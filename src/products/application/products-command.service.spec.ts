import { Test, TestingModule } from '@nestjs/testing';
import { ProductsCommandService } from './products-command.service';
import { ProductRepository } from 'src/products/application/ports/product.repository';
import { ProductFactory } from '../domain/factories/product.factory';
import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { UnitOfWorkPort } from 'src/common/application/ports/unit-of-work.port';
import { Product } from '../domain/product';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Action } from 'src/iam/domain/enums/action.enum';
import { UpdateProductCommand } from './commands/update-product.command';
import { CreateProductCommand } from './commands/create-product.command';
import { createMockProduct } from '../testing/product-builder';
import { createMockUser } from 'src/users/testing/user-builder';
import { CachePort } from 'src/common/application/ports/cache.port';

describe('ProductsCommandService', () => {
  let service: ProductsCommandService;

  const mockProductRepo = {
    save: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };

  const mockProductFactory = {
    createNew: jest.fn(),
  };

  const mockAuthPort = {
    checkPermission: jest.fn(),
  };

  const mockUnitOfWork = {
    execute: jest.fn().mockImplementation((work: () => unknown) => work()),
  };

  const mockCachePort = {
    deleteByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsCommandService,
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: ProductFactory, useValue: mockProductFactory },
        { provide: AuthorizationPort, useValue: mockAuthPort },
        { provide: UnitOfWorkPort, useValue: mockUnitOfWork },
        { provide: CachePort, useValue: mockCachePort },
      ],
    }).compile();

    service = module.get<ProductsCommandService>(ProductsCommandService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockUser = createMockUser();
    const command: CreateProductCommand = {
      name: 'Laptop',
      description: 'This is a laptop',
      price: 250,
    };

    let expectedProduct: Product;
    beforeEach(() => {
      expectedProduct = createMockProduct({
        id: '1',
        name: command.name,
        description: command.description,
        price: command.price,
        createdBy: mockUser.id,
      });
    });

    it('should create and save a new product', async () => {
      mockProductFactory.createNew.mockReturnValue(expectedProduct);
      mockProductRepo.save.mockResolvedValue(undefined);

      const result = await service.create(mockUser, command);

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductFactory.createNew).toHaveBeenCalledWith(
        command.name,
        command.description,
        command.price,
        mockUser.id,
      );
      expect(mockProductRepo.save).toHaveBeenCalledWith(expectedProduct);
      expect(result).toEqual(expectedProduct);
      expect(mockCachePort.deleteByPattern).toHaveBeenCalledWith(
        'GET:/products*',
      );
    });

    it('should throw if saving fails', async () => {
      mockProductFactory.createNew.mockReturnValue(expectedProduct);
      mockProductRepo.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(mockUser, command)).rejects.toThrow(
        'DB Error',
      );

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductFactory.createNew).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const mockUser = createMockUser();
    const command: UpdateProductCommand = {
      id: '1',
      price: 250,
    } as UpdateProductCommand;
    let existingProduct: Product;

    beforeEach(() => {
      existingProduct = createMockProduct({ id: '1', createdBy: 'user-1' });
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepo.findById.mockResolvedValue(null);
      await expect(service.update(mockUser, command)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockProductRepo.save).not.toHaveBeenCalled();
      expect(mockAuthPort.checkPermission).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(false);
      await expect(service.update(mockUser, command)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAuthPort.checkPermission).toHaveBeenCalledWith(
        mockUser,
        Action.Update,
        existingProduct,
      );
      expect(mockProductRepo.save).not.toHaveBeenCalled();
    });

    it('should update and save the product if user has permission', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.save.mockResolvedValue(existingProduct);

      const result = await service.update(mockUser, command);

      expect(mockProductRepo.findById).toHaveBeenCalledWith(command.id);
      expect(mockAuthPort.checkPermission).toHaveBeenCalledWith(
        mockUser,
        Action.Update,
        existingProduct,
      );
      expect(result.getPrice()).toBe(250);
      expect(mockProductRepo.save).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.save).toHaveBeenCalledWith(existingProduct);
      expect(mockCachePort.deleteByPattern).toHaveBeenCalledWith(
        'GET:/products*',
      );
    });

    it('should strip the "id" from the command before passing it to the domain entity', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.save.mockReset();

      const updateDetailsSpy = jest.spyOn(existingProduct, 'updateDetails');

      await service.update(mockUser, command);

      expect(updateDetailsSpy).toHaveBeenCalledWith({ price: 250 });
    });
  });

  describe('remove', () => {
    const mockUser = createMockUser();
    let expectedProduct: Product;

    beforeEach(() => {
      expectedProduct = createMockProduct({ id: '1', createdBy: mockUser.id });
    });

    it('should delete the product if it exists', async () => {
      mockProductRepo.findById.mockResolvedValue(expectedProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.delete.mockResolvedValue(undefined);

      const result = await service.remove(mockUser, expectedProduct.getId());

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(
        expectedProduct.getId(),
      );
      expect(mockAuthPort.checkPermission).toHaveBeenCalledWith(
        mockUser,
        Action.Delete,
        expectedProduct,
      );
      expect(mockProductRepo.delete).toHaveBeenCalledWith(
        expectedProduct.getId(),
      );
      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(mockCachePort.deleteByPattern).toHaveBeenCalledWith(
        'GET:/products*',
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepo.findById.mockResolvedValue(null);

      await expect(
        service.remove(mockUser, expectedProduct.getId()),
      ).rejects.toThrow(NotFoundException);

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(
        expectedProduct.getId(),
      );
      expect(mockAuthPort.checkPermission).not.toHaveBeenCalled();
      expect(mockProductRepo.delete).not.toHaveBeenCalled();
    });
  });
});
