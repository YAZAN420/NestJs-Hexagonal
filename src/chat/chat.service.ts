import { Injectable } from '@nestjs/common';
import { Message } from './message.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) {}
  public generateRoomId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }
  public getRoom(
    data: { room?: string; receiverId?: string; isGroup?: boolean },
    user: ActiveUserData,
  ): string | undefined {
    let targetRoom = data.room;
    if (!data.isGroup && data.receiverId) {
      targetRoom = this.generateRoomId(user.id.toString(), data.receiverId);
    }
    return targetRoom;
  }
  async getChatHistory(roomName: string): Promise<Message[]> {
    const history = await this.messageModel
      .find({ room: roomName })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return history.reverse();
  }
  async saveMessage(
    content: string,
    room: string,
    user: ActiveUserData,
    data: { isGroup?: boolean; receiverId?: string },
  ): Promise<void> {
    try {
      await this.messageModel.create({
        content: content,
        room: room,
        senderId: user.id,
        senderEmail: user.email,
        isGroup: data.isGroup || false,
        receiverId: data.isGroup ? undefined : data.receiverId,
      });
    } catch (err) {
      console.error('Database Error saving message:', err);
    }
  }

  async markMessagesAsRead(room: string, currentUserId: string): Promise<void> {
    try {
      await this.messageModel.updateMany(
        {
          room: room,
          senderId: { $ne: currentUserId },
        },
        {
          $addToSet: { readBy: currentUserId },
        },
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }
}
