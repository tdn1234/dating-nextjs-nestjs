import {
    Controller,
    Get,
    Query,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  import { GeolocationService } from './geolocation.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { GetUser } from '../common/decorators/get-user.decorator';
  import { User } from '../users/entities/user.entity';
  import { FindNearbyUsersDto } from './dto/find-nearby-users.dto';
  
  @ApiTags('Geolocation')
  @Controller('geolocation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class GeolocationController {
    constructor(private readonly geolocationService: GeolocationService) {}
  
    @Get('nearby')
    @ApiOperation({ summary: 'Find nearby users based on location and preferences' })
    @ApiResponse({ status: 200, description: 'Returns nearby users' })
    findNearbyUsers(
      @GetUser() user: User,
      @Query() findNearbyUsersDto: FindNearbyUsersDto,
    ) {
      return this.geolocationService.findNearbyUsers(user.id, findNearbyUsersDto);
    }
  }