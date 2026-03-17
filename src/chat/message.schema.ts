import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  room: string;

  @Prop({ required: true })
  senderId: string;

  @Prop()
  senderEmail: string;

  @Prop({ required: false })
  receiverId?: string;

  @Prop({ default: false })
  isGroup: boolean;

  @Prop({ type: [String], default: [] })
  readBy: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
