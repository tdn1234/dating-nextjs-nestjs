import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MatchEntity } from './entities/match.entity';
import { LikeEntity } from './entities/like.entity';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';
import { MatchCreatedEvent } from './events/match-created.event';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
    @InjectRepository(LikeEntity)
    private readonly likeRepository: Repository<LikeEntity>,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createLike(userId: number, likedUserId: number): Promise<{ matched: boolean }> {
    // Validate users exist
    const user = await this.usersService.findById(userId);
    const likedUser = await this.usersService.findById(likedUserId);

    // Check if already liked
    const existingLike = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
    });

    if (existingLike) {
      throw new BadRequestException('You already liked this user');
    }

    // Check if the other user has already liked this user (potential match)
    const otherLike = await this.likeRepository.findOne({
      where: {
        user: { id: likedUserId },
        likedUser: { id: userId },
      },
    });

    // Create the like
    const like = this.likeRepository.create({
      user: { id: userId },
      likedUser: { id: likedUserId },
      isMatched: !!otherLike,
    });

    await this.likeRepository.save(like);

    // If there's a mutual like, create a match
    if (otherLike) {
      // Update the other like to matched
      otherLike.isMatched = true;
      await this.likeRepository.save(otherLike);

      // Create a match record
      const match = this.matchRepository.create({
        user1: { id: userId },
        user2: { id: likedUserId },
      });

      const savedMatch = await this.matchRepository.save(match);

      // Create a chat room for the match
      const chatRoom = await this.chatService.createChatRoom(userId, likedUserId);

      // Emit match created event
      this.eventEmitter.emit(
        'match.created',
        new MatchCreatedEvent(savedMatch.id, userId, likedUserId, chatRoom.id),
      );

      return { matched: true };
    }

    return { matched: false };
  }

  async unlike(userId: number, likedUserId: number): Promise<void> {
    // Find the like
    const like = await this.likeRepository.findOne({
      where: {
        user: { id: userId },
        likedUser: { id: likedUserId },
      },
      relations: ['user', 'likedUser'],
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    // If there was a match, we need to remove it
    if (like.isMatched) {
      // Find the match
      const match = await this.matchRepository.findOne({
        where: [
          { user1: { id: userId }, user2: { id: likedUserId } },
          { user1: { id: likedUserId }, user2: { id: userId } },
        ],
      });

      if (match) {
        // Delete the match
        await this.matchRepository.remove(match);

        // Delete the chat room
        await this.chatService.deleteChatRoom(userId, likedUserId);
      }

      // Find the other like and update it
      const otherLike = await this.likeRepository.findOne({
        where: {
          user: { id: likedUserId },
          likedUser: { id: userId },
        },
      });

      if (otherLike) {
        otherLike.isMatched = false;
        await this.likeRepository.save(otherLike);
      }
    }

    // Remove the like
    await this.likeRepository.remove(like);
  }

  async getUserMatches(userId: number): Promise<any[]> {
    const matches = await this.matchRepository.find({
      where: [
        { user1: { id: userId } },
        { user2: { id: userId } },
      ],
      relations: ['user1', 'user1.profile', 'user1.photos', 'user2', 'user2.profile', 'user2.photos'],
      order: { createdAt: 'DESC' },
    });

    // Transform the matches to a more user-friendly format
    return matches.map((match) => {
      const isUser1 = match.user1.id === userId;
      const matchedUser = isUser1 ? match.user2 : match.user1;
      const isRead = isUser1 ? match.isRead1 : match.isRead2;

      // Find main photo
      const mainPhoto = matchedUser.photos?.find(photo => photo.isMain)?.url || null;

      return {
        id: match.id,
        matchedUserId: matchedUser.id,
        name: matchedUser.name,
        photoUrl: mainPhoto,
        bio: matchedUser.profile?.bio || '',
        isRead,
        createdAt: match.createdAt,
      };
    });
  }

  async getLikes(userId: number, received = false): Promise<any[]> {
    let likes;

    if (received) {
      // Get likes received by this user
      likes = await this.likeRepository.find({
        where: {
          likedUser: { id: userId },
          isMatched: false, // Only get likes that haven't yet resulted in a match
        },
        relations: ['user', 'user.profile', 'user.photos'],
        order: { createdAt: 'DESC' },
      });

      // Transform the received likes
      return likes.map((like) => {
        // Find main photo
        const mainPhoto = like.user.photos?.find(photo => photo.isMain)?.url || null;

        return {
          id: like.id,
          userId: like.user.id,
          name: like.user.name,
          photoUrl: mainPhoto,
          bio: like.user.profile?.bio || '',
          createdAt: like.createdAt,
        };
      });
    } else {
      // Get likes sent by this user
      likes = await this.likeRepository.find({
        where: {
          user: { id: userId },
        },
        relations: ['likedUser', 'likedUser.profile', 'likedUser.photos'],
        order: { createdAt: 'DESC' },
      });

      // Transform the sent likes
      return likes.map((like) => {
        // Find main photo
        const mainPhoto = like.likedUser.photos?.find(photo => photo.isMain)?.url || null;

        return {
          id: like.id,
          userId: like.likedUser.id,
          name: like.likedUser.name,
          photoUrl: mainPhoto,
          bio: like.likedUser.profile?.bio || '',
          isMatched: like.isMatched,
          createdAt: like.createdAt,
        };
      });
    }
  }

  async markMatchAsRead(userId: number, matchId: number): Promise<void> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Determine if the user is user1 or user2 in the match
    if (match.user1.id === userId) {
      match.isRead1 = true;
    } else if (match.user2.id === userId) {
      match.isRead2 = true;
    } else {
      throw new BadRequestException('User is not part of this match');
    }

    await this.matchRepository.save(match);
  }
}