import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserPreference } from './entities/user-preference.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['profile', 'photos', 'preference'],
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'photos', 'preference'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile', 'photos', 'preference'],
    });
  }

  async create(registerDto: RegisterDto): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      dateOfBirth: registerDto.dateOfBirth,
      gender: registerDto.gender,
    });

    // Create profile
    const profile = this.profileRepository.create({
      bio: registerDto.bio || '',
    });
    user.profile = profile;

    // Create preferences
    const preference = this.preferenceRepository.create({});
    user.preference = preference;

    // Save user with cascade
    return this.userRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    
    // Update user fields
    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    return this.userRepository.save(user);
  }

  async updateProfile(id: number, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    
    // Update profile fields
    if (!user.profile) {
      user.profile = this.profileRepository.create();
    }
    
    Object.assign(user.profile, updateProfileDto);
    
    return this.userRepository.save(user);
  }

  async updatePreferences(id: number, updatePreferenceDto: UpdatePreferenceDto): Promise<User> {
    const user = await this.findById(id);
    
    // Update preference fields
    if (!user.preference) {
      user.preference = this.preferenceRepository.create();
    }
    
    Object.assign(user.preference, updatePreferenceDto);
    
    return this.userRepository.save(user);
  }
  
  async setLocation(
    id: number, 
    latitude: number, 
    longitude: number, 
    city?: string, 
    country?: string
  ): Promise<User> {
    const user = await this.findById(id);
    
    if (!user.profile) {
      user.profile = this.profileRepository.create();
    }
    
    // Create GeoJSON Point
    user.profile.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    
    if (city) user.profile.city = city;
    if (country) user.profile.country = country;
    
    return this.userRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}