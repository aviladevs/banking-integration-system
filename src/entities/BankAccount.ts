import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { IsString, IsNumber, IsEnum } from 'class-validator';
import { User } from './User';
import { Transaction } from './Transaction';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  INVESTMENT = 'investment'
}

export enum BankType {
  BB = 'bb',
  BRADESCO = 'bradesco',
  ITAU = 'itau',
  SANTANDER = 'santander',
  CAIXA = 'caixa',
  NUBANK = 'nubank',
  INTER = 'inter',
  SICOOB = 'sicoob'
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @IsString()
  accountNumber!: string;

  @Column()
  @IsString()
  agency!: string;

  @Column({ type: 'varchar' })
  @IsEnum(AccountType)
  accountType!: AccountType;

  @Column({ type: 'varchar' })
  @IsEnum(BankType)
  bankType!: BankType;

  @Column()
  @IsString()
  bankName!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  @IsNumber()
  balance!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isConnected!: boolean;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.bankAccounts)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @OneToMany(() => Transaction, transaction => transaction.bankAccount)
  transactions!: Transaction[];
}