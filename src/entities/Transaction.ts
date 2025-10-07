import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { IsString, IsNumber, IsEnum, IsDate } from 'class-validator';
import { BankAccount } from './BankAccount';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  TRANSFER = 'transfer',
  PIX = 'pix',
  TED = 'ted',
  DOC = 'doc',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  amount!: number;

  @Column({ type: 'varchar' })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @Column({ type: 'varchar', default: TransactionStatus.COMPLETED })
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;

  @Column()
  @IsDate()
  transactionDate!: Date;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  subcategory?: string;

  @Column({ nullable: true })
  tags?: string;

  @Column({ nullable: true })
  externalId?: string;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ nullable: true })
  recipientDocument?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceAfter?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => BankAccount, bankAccount => bankAccount.transactions)
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount!: BankAccount;

  @Column({ type: 'uuid' })
  bankAccountId!: string;
}