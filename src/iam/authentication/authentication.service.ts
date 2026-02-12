/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthenticationService {
  async signUp(authDto: AuthDto) {
    return { message: 'User signed up successfully', email: authDto.email };
  }

  async signIn(authDto: AuthDto) {
    return { message: 'User signed in successfully', email: authDto.email };
  }
  async signOut() {
    return { message: 'User signed out successfully' };
  }
}
