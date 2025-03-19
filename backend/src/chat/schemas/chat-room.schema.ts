import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class ChatRoom extends Document {
  @Prop({ required: true, index: true })
  userId1: number;

  @Prop({ required: true, index: true })
  userId2: number;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ default: {} })
  metadata: Record<string, any>;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

// Create a compound index for faster lookups
ChatRoomSchema.index({ userId1: 1, userId2: 1 }, { unique: true });