import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './entities/User';
import { BankAccount } from './entities/BankAccount';
import { Transaction } from './entities/Transaction';
import { BankConnection } from './entities/BankConnection';
import { Report } from './entities/Report';
import { Cliente } from './entities/Cliente';

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const wantPostgres = Boolean(process.env.DATABASE_URL) || (process.env.DB_TYPE || '').toLowerCase() === 'postgres';
const allowSync = process.env.DB_SYNC === 'true' || !isProd; // permite habilitar sync em prod via env, use com cautela

const common = {
  synchronize: allowSync,
  logging: !isProd,
  entities: [User, BankAccount, Transaction, BankConnection, Report, Cliente] as any[],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts']
};

let options: DataSourceOptions;
if (wantPostgres) {
  options = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: isProd ? { rejectUnauthorized: false } : undefined,
    ...common,
  } as DataSourceOptions;
} else {
  options = {
    type: 'sqlite',
    database: process.env.DATABASE_PATH || 'database.sqlite',
    ...common,
  } as DataSourceOptions;
}

export const AppDataSource = new DataSource(options);