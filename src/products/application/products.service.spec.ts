import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductRepository } from './ports/product.repository';
import { ProductFactory } from '../domain/factories/product.factory';
import { AuthorizationPort } from 'src/iam/application/ports/authorization.port';
import { UnitOfWorkPort } from 'src/common/application/ports/unit-of-work.port';
import { Product } from '../domain/product';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Action } from 'src/iam/domain/enums/action.enum';
import { UpdateProductCommand } from './command/update-product.command';
import { CreateProductCommand } from './command/create-product.command';
import { createMockProduct } from '../testing/product-builder';
import { createMockUser } from 'src/users/testing/user-builder';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProductRepo = {
    save: jest.fn(),
    findAll: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: ProductFactory, useValue: mockProductFactory },
        { provide: AuthorizationPort, useValue: mockAuthPort },
        { provide: UnitOfWorkPort, useValue: mockUnitOfWork },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
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
    beforeEach(() => {
      expectedProduct = createMockProduct({ id: productId });
    });
    it('should return a product if it exists', async () => {
      mockProductRepo.findById.mockResolvedValue(expectedProduct);

      const result = await service.findOne(productId);

      expect(result).toEqual(expectedProduct);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(1);
    });
    it('should throw NotFoundException if product does not exist', async () => {
      const productId = 'non-existing-id';
      mockProductRepo.findById.mockResolvedValue(null);
      await expect(service.findOne(productId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockProductRepo.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepo.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    const mockUser = createMockUser();
    const command = { id: '1', price: 250 };
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
    });
    it('should propagate error if saving fails', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.update(mockUser, command)).rejects.toThrow(
        'DB Error',
      );
    });
    it('should not allow updating the createdBy field', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.save.mockReset();
      const maliciousCommand = {
        id: '1',
        price: 300,
        createdBy: 'attacker',
      } as unknown as UpdateProductCommand;
      const result = await service.update(mockUser, maliciousCommand);
      expect(result.createdBy).toBe('user-1');
      expect(result.createdBy).not.toBe('attacker');
    });
    it('should execute inside unit of work', async () => {
      mockProductRepo.findById.mockResolvedValue(existingProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.save.mockReset();

      await service.update(mockUser, command);

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
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
    it('should throw ForbiddenException if user lacks permission', async () => {
      mockProductRepo.findById.mockResolvedValue(expectedProduct);
      mockAuthPort.checkPermission.mockReturnValue(false);

      await expect(
        service.remove(mockUser, expectedProduct.getId()),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(
        expectedProduct.getId(),
      );
      expect(mockAuthPort.checkPermission).toHaveBeenCalledWith(
        mockUser,
        Action.Delete,
        expectedProduct,
      );
      expect(mockProductRepo.delete).not.toHaveBeenCalled();
    });
    it('should propagate error if deletion fails', async () => {
      mockProductRepo.findById.mockResolvedValue(expectedProduct);
      mockAuthPort.checkPermission.mockReturnValue(true);
      mockProductRepo.delete.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.remove(mockUser, expectedProduct.getId()),
      ).rejects.toThrow('DB Error');
      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.findById).toHaveBeenCalledWith(
        expectedProduct.getId(),
      );
      expect(mockAuthPort.checkPermission).toHaveBeenCalledWith(
        mockUser,
        Action.Delete,
        expectedProduct,
      );
      expect(mockProductRepo.delete).toHaveBeenCalled();
    });
  });
});
