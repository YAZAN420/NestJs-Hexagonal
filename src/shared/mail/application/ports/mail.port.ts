import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class MailPort {
  abstract sendVerificationEmail(email: string, token: string): Promise<void>;
  abstract sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
