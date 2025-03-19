import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchEntity } from './entities/match.entity';
import { LikeEntity } from './entities/like.entity';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchEntity, LikeEntity]),
    UsersModule,
    ChatModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}