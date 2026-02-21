import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mailConfig from 'src/config/mail.config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.mailConfiguration.host,
      port: this.mailConfiguration.port,
      secure: false,
      auth: {
        user: this.mailConfiguration.user,
        pass: this.mailConfiguration.pass,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const verificationUrl = `http://localhost:3000/authentication/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: '"Application Security" <no-reply@app.com>',
      to,
      subject: 'Verify your email address',
      html: `
        <h3>Welcome!</h3>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `http://localhost:3000/authentication/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: '"Application Security" <no-reply@app.com>',
      to,
      subject: 'Password Reset Request',
      html: `
        <h3>Password Reset</h3>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
