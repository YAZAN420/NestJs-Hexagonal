import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/infrastructure/logger/winston.config';
import { ResponseInterceptor } from './common/presentation/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/presentation/filters/global-exception.filter';

async function bootstrap() {
  const dbDriver =
    (process.env.DB_TYPE as 'mongoose' | 'in-memory') || 'mongoose';
  const app = await NestFactory.create(
    AppModule.register({ driver: dbDriver }),
    {
      logger: WinstonModule.createLogger(winstonConfig),
    },
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.use(helmet());

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('NestJS Course API')
    .setDescription('The helper API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap().catch(console.error);
