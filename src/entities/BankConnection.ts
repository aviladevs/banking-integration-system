import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsString, IsEnum, IsBoolean } from 'class-validator';
import { User } from './User';
import { BankType } from './BankAccount';

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  PENDING = 'pending'
}

@Entity('bank_connections')
export class BankConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @IsEnum(BankType)
  bankType!: BankType;

  @Column()
  @IsString()
  bankName!: string;

  @Column({ type: 'varchar', default: ConnectionStatus.PENDING })
  @IsEnum(ConnectionStatus)
  status!: ConnectionStatus;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive!: boolean;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  tokenExpiresAt?: Date;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column({ nullable: true })
  lastError?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.bankConnections)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;
}