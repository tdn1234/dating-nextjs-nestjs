import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Column,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  @Entity('likes')
  export class LikeEntity {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'liked_user_id' })
    likedUser: User;
  
    @Column({ default: false })
    isMatched: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  }