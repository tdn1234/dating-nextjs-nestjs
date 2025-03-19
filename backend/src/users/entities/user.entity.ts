import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
  } from 'typeorm';
  import { Exclude } from 'class-transformer';
  import { UserProfile } from './user-profile.entity';
  import { UserPhoto } from './user-photo.entity';
  import { UserPreference } from './user-preference.entity';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    name: string;
  
    @Column({ unique: true })
    email: string;
  
    @Column()
    @Exclude({ toPlainOnly: true })
    password: string;
  
    @Column({ type: 'date' })
    dateOfBirth: Date;
  
    @Column()
    gender: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
    profile: UserProfile;
  
    @OneToMany(() => UserPhoto, (photo) => photo.user, { cascade: true })
    photos: UserPhoto[];
  
    @OneToOne(() => UserPreference, (preference) => preference.user, { cascade: true })
    preference: UserPreference;
  }