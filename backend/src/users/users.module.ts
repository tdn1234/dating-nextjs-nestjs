import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserPhoto } from './entities/user-photo.entity';
import { UserPreference } from './entities/user-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      UserPhoto,
      UserPreference,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}