import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailPort } from 'src/shared/mail/application/ports/mail.port';

@Processor('mail-queue', { concurrency: 10 })
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailPort: MailPort) {
    super();
  }
  async process(
    job: Job<{ email: string; token: string }, any, string>,
  ): Promise<any> {
    const { email, token } = job.data;
    try {
      if (job.name === 'send-verification-email') {
        await this.mailPort.sendVerificationEmail(email, token);
        console.log(`[Queue] Verification email sent to ${email}`);
      } else if (job.name === 'send-password-reset-email') {
        await this.mailPort.sendPasswordResetEmail(email, token);
        console.log(`[Queue] Password reset email sent to ${email}`);
      }
    } catch (error) {
      console.error(`[Queue] Failed to send email to ${email}`, error);
      throw error;
    }
  }
  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(
      `[🚀 Worker] Starting job ${job.id} of type ${job.name}. Attempt: ${job.attemptsMade + 1}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    console.log(
      `[✅ Worker] Job ${job.id} completed successfully. Result: ${result}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(
      `[❌ Worker] Job ${job.id} failed on attempt ${job.attemptsMade}. Error: ${error.message}`,
    );

    if (job.attemptsMade < job.opts.attempts!) {
      console.log(`[🔄 Worker] Will retry job ${job.id} later...`);
    } else {
      console.error(
        `[💀 Worker] Job ${job.id} has permanently failed after all attempts.`,
      );
    }
  }
}
