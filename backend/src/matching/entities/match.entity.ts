import {
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Column,
  } from 'typeorm';
  import { User } from '../../users/entities/user.entity';
  
  @Entity('matches')
  export class MatchEntity {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id_1' })
    user1: User;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id_2' })
    user2: User;
  
    @Column({ default: false })
    isRead1: boolean;
  
    @Column({ default: false })
    isRead2: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  }
