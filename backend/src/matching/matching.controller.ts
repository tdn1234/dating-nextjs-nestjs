import {
    Controller,
    Post,
    Delete,
    Get,
    Param,
    UseGuards,
    Query,
    ParseBoolPipe,
    DefaultValuePipe,
    Patch,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
  
  import { MatchingService } from './matching.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { GetUser } from '../common/decorators/get-user.decorator';
  import { User } from '../users/entities/user.entity';
  
  @ApiTags('Matching')
  @Controller('matching')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class MatchingController {
    constructor(private readonly matchingService: MatchingService) {}
  
    @Post('like/:id')
    @ApiOperation({ summary: 'Like a user' })
    @ApiResponse({ status: 201, description: 'User liked successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiParam({ name: 'id', description: 'User ID to like' })
    async likeUser(
      @GetUser() user: User,
      @Param('id') likedUserId: number,
    ) {
      return this.matchingService.createLike(user.id, likedUserId);
    }
  
    @Delete('like/:id')
    @ApiOperation({ summary: 'Unlike a user' })
    @ApiResponse({ status: 200, description: 'User unliked successfully' })
    @ApiResponse({ status: 404, description: 'Like not found' })
    @ApiParam({ name: 'id', description: 'User ID to unlike' })
    async unlikeUser(
      @GetUser() user: User,
      @Param('id') likedUserId: number,
    ) {
      await this.matchingService.unlike(user.id, likedUserId);
      return { success: true };
    }
  
    @Get('matches')
    @ApiOperation({ summary: 'Get current user matches' })
    @ApiResponse({ status: 200, description: 'Returns user matches' })
    async getMatches(@GetUser() user: User) {
      return this.matchingService.getUserMatches(user.id);
    }
  
    @Get('likes')
    @ApiOperation({ summary: 'Get likes sent or received by the current user' })
    @ApiResponse({ status: 200, description: 'Returns likes' })
    @ApiQuery({ 
      name: 'received', 
      type: Boolean, 
      required: false, 
      description: 'Set to true to get received likes, false for sent likes' 
    })
    async getLikes(
      @GetUser() user: User,
      @Query('received', new DefaultValuePipe(false), ParseBoolPipe) received: boolean,
    ) {
      return this.matchingService.getLikes(user.id, received);
    }
  
    @Patch('matches/:id/read')
    @ApiOperation({ summary: 'Mark a match as read' })
    @ApiResponse({ status: 200, description: 'Match marked as read' })
    @ApiResponse({ status: 404, description: 'Match not found' })
    @ApiParam({ name: 'id', description: 'Match ID to mark as read' })
    async markMatchAsRead(
      @GetUser() user: User,
      @Param('id') matchId: number,
    ) {
      await this.matchingService.markMatchAsRead(user.id, matchId);
      return { success: true };
    }
  }