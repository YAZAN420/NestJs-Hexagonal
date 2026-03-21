import { Test, TestingModule } from '@nestjs/testing';
import {
  CallHandler,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PoliciesGuard } from 'src/iam/presentation/http/guards/policies.guard';
import { Request } from 'express';
import { Server } from 'http';
import { ApiResponse } from './types/api-response.interface';
import { RolesGuard } from 'src/iam/presentation/http/guards/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { HttpCacheInterceptor } from 'src/common/presentation/interceptors/http-cache.interceptor';
describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let createdProductId: string;
  let authToken: string;
  const mockTestUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.register({ driver: 'in-memory' })],
    })
      .overrideGuard(PoliciesGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideInterceptor(HttpCacheInterceptor)
      .useValue({
        intercept: (context: ExecutionContext, next: CallHandler) =>
          next.handle(),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
    const jwtService = app.get<JwtService>(JwtService);
    authToken = await jwtService.signAsync({
      id: mockTestUser.id,
      email: mockTestUser.email,
      role: mockTestUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('/products (POST) - should create a new product', async () => {
    const createProductDto = {
      name: 'E2E Testing Laptop',
      description: 'Laptop created during e2e tests',
      price: 1500,
    };
    const response = await request(app.getHttpServer() as Server)
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createProductDto)
      .expect(201);
    const body = response.body as ApiResponse<{
      id: string;
      name: string;
      price: number;
      _createdBy: string;
    }>;
    expect(body.message).toBe('Product created successfully');
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(createProductDto.name);
    expect(body.data.price).toBe(createProductDto.price);
    expect(body.data._createdBy).toBe(mockTestUser.id);
    expect(body.data).toHaveProperty('id');

    createdProductId = body.data.id;
  });
  it('/products (GET) - should return all products', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const body = response.body as ApiResponse<any[]>;
    expect(body.message).toBe('Products fetched successfully');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
  });
  it('/products/:id (GET) - should return the specific product', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const body = response.body as ApiResponse<{
      id: string;
      name: string;
      price: number;
    }>;

    expect(body.message).toBe('Product fetched successfully');
    expect(body.data.id).toBe(createdProductId);
    expect(body.data.name).toBe('E2E Testing Laptop');
  });
  it('/products/:id (PATCH) - should update the product price', async () => {
    const updateProductDto = {
      price: 1200,
    };

    const response = await request(app.getHttpServer() as Server)
      .patch(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateProductDto)
      .expect(200);

    const body = response.body as ApiResponse<{
      id: string;
      price: number;
    }>;

    expect(body.message).toBe('Product updated successfully');
    expect(body.data.price).toBe(1200);
  });
  it('/products/:id (DELETE) - should delete the product', async () => {
    const response = await request(app.getHttpServer() as Server)
      .delete(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const body = response.body as { message: string };
    expect(body.message).toBe('Product deleted successfully');
  });

  it('/products/:id (GET) - should throw 404 because product is deleted', async () => {
    await request(app.getHttpServer() as Server)
      .get(`/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
