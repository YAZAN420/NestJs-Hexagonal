import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Message, MessageSchema } from './message.schema';

@Module({})
export class ChatModule {
  static register(driver: 'mongoose' | 'in-memory'): DynamicModule {
    const imports =
      driver === 'mongoose'
        ? [
            MongooseModule.forFeature([
              { name: Message.name, schema: MessageSchema },
            ]),
          ]
        : [];

    return {
      module: ChatModule,
      imports,
      providers: [ChatService, ChatGateway],
      exports: [ChatGateway],
    };
  }
}
