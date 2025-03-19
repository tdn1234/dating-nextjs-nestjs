import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserPreference } from '../users/entities/user-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserPreference]),
  ],
  controllers: [GeolocationController],
  providers: [GeolocationService],
  exports: [GeolocationService],
})
export class GeolocationModule {}