import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: false, select: false })
  refreshToken?: string;

  @Prop({
    type: String,
    enum: Role,
    default: Role.Regular,
  })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);
