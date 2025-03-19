import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { FindNearbyUsersDto } from './dto/find-nearby-users.dto';
import { CalculateAgeUtil } from '../common/utils/calculate-age.util';

@Injectable()
export class GeolocationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  async findNearbyUsers(userId: number, options: FindNearbyUsersDto) {
    const { maxDistance = 50, limit = 20, offset = 0 } = options;
    
    // Get the current user's profile with location
    const userProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'user.preference'],
    });
    
    if (!userProfile || !userProfile.location) {
      return { users: [], total: 0 };
    }

    // Get the user's preference
    const userPreference = userProfile.user.preference;
    const genderPreference = userPreference.genderPreference || [];
    const minAge = userPreference.minAge || 18;
    const maxAge = userPreference.maxAge || 99;
    
    // Create a query to find nearby users based on PostgreSQL's PostGIS extension
    // Use ST_Distance to calculate distance between points
    const query = this.profileRepository
      .createQueryBuilder('profile')
      .select([
        'profile',
        'user.id',
        'user.name',
        'user.gender',
        'user.dateOfBirth',
        'photos.id',
        'photos.url',
        'photos.isMain',
      ])
      .addSelect(
        `ST_Distance(
          profile.location, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        ) * 111.325`,
        'distance'
      )
      .innerJoin('profile.user', 'user')
      .leftJoin('user.photos', 'photos')
      .where('user.id != :userId', { userId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere(
        `ST_DWithin(
          profile.location, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326), 
          :maxDistance / 111.325
        )`,
        {
          maxDistance,
        }
      )
      .setParameters([
        userProfile.location.coordinates[0], // longitude
        userProfile.location.coordinates[1], // latitude
      ]);
      
    // Apply gender filter if preference is specified
    if (genderPreference.length > 0) {
      query.andWhere('user.gender IN (:...genderPreference)', { genderPreference });
    }
    
    // Apply age filter
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - maxAge - 1);
    
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() - minAge);
    
    query.andWhere('user.dateOfBirth BETWEEN :minDate AND :maxDate', {
      minDate,
      maxDate,
    });
    
    // Finalize the query with order, limit and offset
    query
      .orderBy('distance', 'ASC')
      .limit(limit)
      .offset(offset);
    
    // Execute the query
    const [users, total] = await query.getManyAndCount();
    
    // Transform the results to add calculated distance and age
    const transformedUsers = users.map((profile) => {
      const age = CalculateAgeUtil.calculateAge(profile.user.dateOfBirth);
      const distance = parseFloat(profile['distance']).toFixed(1);
      
      // Find main photo
      const mainPhoto = profile.user.photos?.find(photo => photo.isMain)?.url || null;
      
      return {
        id: profile.user.id,
        name: profile.user.name,
        age,
        gender: profile.user.gender,
        distance: parseFloat(distance),
        photoUrl: mainPhoto,
        bio: profile.bio,
        city: profile.city,
        country: profile.country,
      };
    });
    
    return {
      users: transformedUsers,
      total,
    };
  }
}