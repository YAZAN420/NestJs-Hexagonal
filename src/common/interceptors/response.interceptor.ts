import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

interface ControllerResponse<T> {
  message?: string;
  data: T;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  ControllerResponse<T>,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<ControllerResponse<T>>,
  ) {
    return next.handle().pipe(
      map(
        (response): ApiResponse<T> => ({
          success: true,
          message: response.message ?? 'Request successful',
          data: response.data,
          timestamp: new Date().toISOString(),
        }),
      ),
    );
  }
}
