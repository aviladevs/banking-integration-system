import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsString, IsEnum, IsDate } from 'class-validator';
import { User } from './User';

export enum ReportType {
  FINANCIAL = 'financial',
  TRANSACTIONS = 'transactions',
  BALANCE = 'balance',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  CUSTOM = 'custom'
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  name!: string;

  @Column({ type: 'varchar' })
  @IsEnum(ReportType)
  type!: ReportType;

  @Column({ type: 'varchar', default: ReportFormat.PDF })
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @Column({ type: 'varchar', default: ReportStatus.GENERATING })
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @Column()
  @IsDate()
  startDate!: Date;

  @Column()
  @IsDate()
  endDate!: Date;

  @Column({ type: 'json', nullable: true })
  filters?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  data?: Record<string, any>;

  @Column({ nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;
}