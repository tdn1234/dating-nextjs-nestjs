import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  
  @Entity('user_preferences')
  export class UserPreference {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ default: 18 })
    minAge: number;
  
    @Column({ default: 99 })
    maxAge: number;
  
    @Column({ type: 'simple-array', default: '' })
    genderPreference: string[];
  
    @Column({ default: 50 })
    maxDistance: number;
  
    @Column({ default: true })
    showOnlineStatus: boolean;
  
    @Column({ default: true })
    notificationsEnabled: boolean;
  
    @Column({ default: false })
    hideProfile: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @OneToOne(() => User, (user) => user.preference)
    @JoinColumn({ name: 'user_id' })
    user: User;
  }