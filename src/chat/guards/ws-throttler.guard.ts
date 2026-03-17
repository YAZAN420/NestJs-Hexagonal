import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration } = requestProps;

    const client = context.switchToWs().getClient<Socket>();

    const ip = client.handshake.address;

    const key = this.generateKey(context, ip, throttler.name as string);

    const { totalHits } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttler.name as string,
    );

    if (totalHits > limit) {
      throw new WsException({
        error: 'Too Many Requests',
        message: 'Too many requests, please try again later.',
      });
    }

    return true;
  }
}
