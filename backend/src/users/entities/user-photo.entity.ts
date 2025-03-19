import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  
  @Entity('user_photos')
  export class UserPhoto {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    url: string;
  
    @Column({ default: false })
    isMain: boolean;
  
    @Column({ default: false })
    isApproved: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @ManyToOne(() => User, (user) => user.photos)
    @JoinColumn({ name: 'user_id' })
    user: User;
  }