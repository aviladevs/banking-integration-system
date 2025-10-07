import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { BankAccount } from './entities/BankAccount';
import { Transaction } from './entities/Transaction';
import { BankConnection } from './entities/BankConnection';
import { Report } from './entities/Report';
import { Cliente } from './entities/Cliente';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true, // Auto-sync schema in development
  logging: process.env.NODE_ENV === 'development',
  entities: [User, BankAccount, Transaction, BankConnection, Report, Cliente],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});