import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { BankAccount } from './BankAccount';
import { BankConnection } from './BankConnection';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column()
  @IsString()
  @MinLength(2)
  name!: string;

  @Column()
  @MinLength(6)
  password!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => BankAccount, bankAccount => bankAccount.user)
  bankAccounts!: BankAccount[];

  @OneToMany(() => BankConnection, bankConnection => bankConnection.user)
  bankConnections!: BankConnection[];
}