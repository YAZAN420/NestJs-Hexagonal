import { UseFilters, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AccessTokenGuard } from 'src/iam/presentation/http/guards/access-token.guard';

import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { ChatService } from './chat.service';
import { WsExceptionFilter } from 'src/common/presentation/filters/ws-exception.filter';
import type { ChatPayload } from './interfaces/chat-payload.interface';

@UseGuards(AccessTokenGuard)
@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  private activeConnections = new Map<string, number>();

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`client ${client.id} connected!`);
  }

  handleDisconnect(client: Socket & { user?: ActiveUserData }) {
    const user = client.user;
    if (user) {
      const userId = user.id.toString();
      const count = this.activeConnections.get(userId) || 0;
      if (count > 1) {
        this.activeConnections.set(userId, count - 1);
      } else {
        this.activeConnections.delete(userId);
        this.server.emit('userStatus', { userId, status: 'offline' });
      }
    }
  }

  @SubscribeMessage('goOnline')
  async handleGoOnline(
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const user = client.user;
    if (!user)
      throw new WsException({
        error: 'Unauthorized',
        message: 'User not found!',
      });

    const globalRoom = `user_${user.id}`;
    await client.join(globalRoom);

    const count = this.activeConnections.get(user.id.toString()) || 0;
    this.activeConnections.set(user.id.toString(), count + 1);

    if (count === 0) {
      this.server.emit('userStatus', { user, status: 'online' });
    }

    return {
      status: 'success',
      message: 'successfully joined global room',
      timestamp: new Date(),
    };
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const { user, targetRoom } = this.validateAndGetContext(client, data);

    await client.join(targetRoom);
    await this.chatService.markMessagesAsRead(targetRoom, user.id.toString());

    client.broadcast.to(targetRoom).emit('messagesRead', {
      room: targetRoom,
      readBy: user.id,
      timestamp: new Date(),
    });

    const history = await this.chatService.getChatHistory(targetRoom);
    client.emit('chatHistory', history);

    return {
      status: 'success',
      message: 'joined room successfully',
      room: targetRoom,
    };
  }

  @SubscribeMessage('sendMessageToRoom')
  async handleMessageToRoom(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const { user, targetRoom } = this.validateAndGetContext(client, data);

    if (!data.message) {
      throw new WsException({
        error: 'Bad Request',
        message: 'Message content is empty!',
      });
    }

    this.server.to(targetRoom).emit('receiveMessage', {
      content: data.message,
      senderEmail: user.email,
      isGroup: data.isGroup || false,
      createdAt: new Date(),
    });

    if (!data.isGroup && data.receiverId) {
      this.server.to(`user_${data.receiverId}`).emit('newNotification', {
        title: 'new message',
        body: `you have a new message from ${user.email}`,
        senderId: user.id,
        messagePreview: data.message,
      });
    }

    await this.chatService.saveMessage(data.message, targetRoom, user, data);

    return { status: 'success', message: 'Message sent', room: targetRoom };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const { user, targetRoom } = this.validateAndGetContext(client, data);
    client.broadcast
      .to(targetRoom)
      .emit('userTyping', { typing: true, userId: user.id });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const { user, targetRoom } = this.validateAndGetContext(client, data);
    client.broadcast
      .to(targetRoom)
      .emit('userTyping', { typing: false, userId: user.id });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket & { user?: ActiveUserData },
  ) {
    const { user, targetRoom } = this.validateAndGetContext(client, data);

    await this.chatService.markMessagesAsRead(targetRoom, user.id.toString());

    client.broadcast.to(targetRoom).emit('messagesRead', {
      room: targetRoom,
      readBy: user.id,
      timestamp: new Date(),
    });

    return { status: 'success', message: 'Messages marked as read' };
  }

  private validateAndGetContext(
    client: Socket & { user?: ActiveUserData },
    data: ChatPayload,
  ) {
    const user = client.user;
    if (!user) {
      throw new WsException({
        error: 'Unauthorized',
        message: 'User not found in socket!',
      });
    }

    const targetRoom = this.chatService.getRoom(data, user);
    if (!targetRoom) {
      throw new WsException({
        error: 'Bad Request',
        message: 'Room ID or receiverId is missing!',
      });
    }

    return { user, targetRoom };
  }
}
