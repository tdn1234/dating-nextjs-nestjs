import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    Delete,
    UseGuards,
    NotFoundException,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  import { UsersService } from './users.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { GetUser } from '../common/decorators/get-user.decorator';
  import { User } from './entities/user.entity';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { UpdateProfileDto } from './dto/update-profile.dto';
  import { UpdatePreferenceDto } from './dto/update-preference.dto';
  import { SetLocationDto } from './dto/set-location.dto';
  
  @ApiTags('Users')
  @Controller('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Returns current user profile' })
    getProfile(@GetUser() user: User) {
      return user;
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'Returns the user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: number) {
      try {
        return await this.usersService.findById(id);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new NotFoundException('User not found');
      }
    }
  
    @Patch('profile')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated successfully' })
    async updateProfile(
      @GetUser() user: User,
      @Body() updateProfileDto: UpdateProfileDto,
    ) {
      return this.usersService.updateProfile(user.id, updateProfileDto);
    }
  
    @Patch('account')
    @ApiOperation({ summary: 'Update current user account' })
    @ApiResponse({ status: 200, description: 'User account updated successfully' })
    async updateAccount(
      @GetUser() user: User,
      @Body() updateUserDto: UpdateUserDto,
    ) {
      return this.usersService.update(user.id, updateUserDto);
    }
  
    @Patch('preferences')
    @ApiOperation({ summary: 'Update current user preferences' })
    @ApiResponse({ status: 200, description: 'User preferences updated successfully' })
    async updatePreferences(
      @GetUser() user: User,
      @Body() updatePreferenceDto: UpdatePreferenceDto,
    ) {
      return this.usersService.updatePreferences(user.id, updatePreferenceDto);
    }
  
    @Patch('location')
    @ApiOperation({ summary: 'Update current user location' })
    @ApiResponse({ status: 200, description: 'User location updated successfully' })
    async updateLocation(
      @GetUser() user: User,
      @Body() setLocationDto: SetLocationDto,
    ) {
      return this.usersService.setLocation(
        user.id,
        setLocationDto.latitude,
        setLocationDto.longitude,
        setLocationDto.city,
        setLocationDto.country,
      );
    }
  
    @Delete()
    @ApiOperation({ summary: 'Delete current user account' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    async remove(@GetUser() user: User) {
      await this.usersService.delete(user.id);
      return { message: 'User deleted successfully' };
    }
  }