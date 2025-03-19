import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRoom } from './schemas/chat-room.schema';
import { Message, MessageStatus } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoom>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly usersService: UsersService,
  ) {}

  async createChatRoom(userId1: number, userId2: number): Promise<ChatRoom> {
    // Sort user IDs to maintain consistency
    const [smallerId, largerId] = [userId1, userId2].sort((a, b) => a - b);

    // Check if a chat room already exists
    const existingRoom = await this.chatRoomModel.findOne({
      userId1: smallerId,
      userId2: largerId,
    });

    if (existingRoom) {
      // If it exists but was deactivated, reactivate it
      if (!existingRoom.isActive) {
        existingRoom.isActive = true;
        existingRoom.lastActivity = new Date();
        return existingRoom.save();
      }
      return existingRoom;
    }

    // Create a new chat room
    const chatRoom = new this.chatRoomModel({
      userId1: smallerId,
      userId2: largerId,
      isActive: true,
      lastActivity: new Date(),
    });

    return chatRoom.save();
  }

  async findChatRoom(userId1: number, userId2: number): Promise<ChatRoom> {
    // Sort user IDs to maintain consistency
    const [smallerId, largerId] = [userId1, userId2].sort((a, b) => a - b);

    const chatRoom = await this.chatRoomModel.findOne({
      userId1: smallerId,
      userId2: largerId,
      isActive: true,
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    return chatRoom;
  }

  async findChatRoomById(chatRoomId: string): Promise<ChatRoom> {
    if (!Types.ObjectId.isValid(chatRoomId)) {
      throw new BadRequestException('Invalid chat room ID');
    }

    const chatRoom = await this.chatRoomModel.findById(chatRoomId);

    if (!chatRoom || !chatRoom.isActive) {
      throw new NotFoundException('Chat room not found');
    }

    return chatRoom;
  }

  async getUserChatRooms(userId: number): Promise<any[]> {
    const chatRooms = await this.chatRoomModel.find({
      $or: [{ userId1: userId }, { userId2: userId }],
      isActive: true,
    }).sort({ lastActivity: -1 });

    // Get the latest message for each chat room
    const chatRoomsWithLatestMessage = await Promise.all(
      chatRooms.map(async (room) => {
        const otherUserId = room.userId1 === userId ? room.userId2 : room.userId1;
        
        // Get other user details
        const otherUser = await this.usersService.findById(otherUserId);
        
        // Get latest message
        const latestMessage = await this.messageModel.findOne({
          chatRoomId: room._id,
          isDeleted: false,
        }).sort({ createdAt: -1 });
        
        // Get unread count
        const unreadCount = await this.messageModel.countDocuments({
          chatRoomId: room._id,
          recipientId: userId,
          status: { $ne: MessageStatus.READ },
          isDeleted: false,
        });
        
        return {
          id: room._id,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name,
            photoUrl: otherUser.photos?.find(photo => photo.isMain)?.url || null,
          },
          lastMessage: latestMessage ? {
            id: latestMessage._id,
            content: latestMessage.content,
            senderId: latestMessage.senderId,
            createdAt: latestMessage.createdAt,
            status: latestMessage.status,
          } : null,
          unreadCount,
          lastActivity: room.lastActivity,
        };
      })
    );
    
    return chatRoomsWithLatestMessage;
  }

  async createMessage(
    userId: number,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const { chatRoomId, recipientId, content } = createMessageDto;
    
    // Validate chat room
    const chatRoom = await this.findChatRoomById(chatRoomId);
    
    // Verify that the sender is part of the chat room
    if (chatRoom.userId1 !== userId && chatRoom.userId2 !== userId) {
      throw new BadRequestException('User is not a member of this chat room');
    }
    
    // Verify that the recipient is the other user in the chat room
    const otherUserId = chatRoom.userId1 === userId ? chatRoom.userId2 : chatRoom.userId1;
    if (otherUserId !== recipientId) {
      throw new BadRequestException('Invalid recipient for this chat room');
    }
    
    // Create the message
    const message = new this.messageModel({
      chatRoomId,
      senderId: userId,
      recipientId,
      content,
      status: MessageStatus.SENT,
    });
    
    // Update the chat room's last activity
    chatRoom.lastActivity = new Date();
    await chatRoom.save();
    
    return message.save();
  }

  async getMessages(
    userId: number,
    chatRoomId: string,
    limit = 20,
    before?: string,
  ): Promise<Message[]> {
    // Validate chat room and user membership
    const chatRoom = await this.findChatRoomById(chatRoomId);
    
    if (chatRoom.userId1 !== userId && chatRoom.userId2 !== userId) {
      throw new BadRequestException('User is not a member of this chat room');
    }
    
    // Build query
    const query: any = {
      chatRoomId,
      isDeleted: false,
    };
    
    // If 'before' parameter is provided, get messages before that message ID
    if (before && Types.ObjectId.isValid(before)) {
      const beforeMessage = await this.messageModel.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }
    
    // Get messages
    const messages = await this.messageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Mark messages as read if user is the recipient
    await this.messageModel.updateMany(
      {
        chatRoomId,
        recipientId: userId,
        status: { $ne: MessageStatus.READ },
      },
      {
        $set: { 
          status: MessageStatus.READ,
          readAt: new Date(),
        },
      },
    );
    
    return messages.reverse();
  }

  async markMessagesAsRead(userId: number, chatRoomId: string): Promise<void> {
    // Validate chat room and user membership
    const chatRoom = await this.findChatRoomById(chatRoomId);
    
    if (chatRoom.userId1 !== userId && chatRoom.userId2 !== userId) {
      throw new BadRequestException('User is not a member of this chat room');
    }
    
    // Mark messages as read
    await this.messageModel.updateMany(
      {
        chatRoomId,
        recipientId: userId,
        status: { $ne: MessageStatus.READ },
      },
      {
        $set: { 
          status: MessageStatus.READ,
          readAt: new Date(),
        },
      },
    );
  }

  async deleteMessage(userId: number, messageId: string): Promise<void> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID');
    }
    
    const message = await this.messageModel.findById(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    
    // Verify the user is the sender of the message
    if (message.senderId !== userId) {
      throw new BadRequestException('User is not the sender of this message');
    }
    
    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
  }

  async deleteChatRoom(userId1: number, userId2: number): Promise<void> {
    try {
      const chatRoom = await this.findChatRoom(userId1, userId2);
      
      // Soft delete - just mark as inactive
      chatRoom.isActive = false;
      await chatRoom.save();
    } catch (error) {
      // If chat room doesn't exist, that's fine for this operation
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
  }
}