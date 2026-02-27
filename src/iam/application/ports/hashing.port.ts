import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingPort {
  abstract hash(data: string | Buffer): Promise<string>;
  abstract compare(data: string | Buffer, encrypted: string): Promise<boolean>;
}
