import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { AppDataSource } from './data-source';
import authRoutes from './routes/auth';
import bankRoutes from './routes/banks';
import userRoutes from './routes/users';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import analyticsRoutes from './routes/analytics-simple';
import analyticsAdvancedRoutes from './routes/analytics-advanced';
import notificationRoutes from './routes/notifications';
import securityRoutes from './routes/security';
import backupRoutes from './routes/backup';
import clientesRoutes from './routes/clientes';
import { seedAdmin } from './bootstrap/seedAdmin';
import nfeRoutes from './routes/nfe';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics-advanced', analyticsAdvancedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/nfe', nfeRoutes);

// Serve main page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Setup page for when database is not connected
app.get('/setup', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/setup.html'));
});

// Health check
app.get('/health', (_req, res) => {
  const dbConnected = AppDataSource.isInitialized;
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = () => {
  app.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
};

// Try to connect to database, but start server anyway
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected successfully');
    // Seed default admin user in development or if explicitly requested
    const shouldSeed = process.env.SEED_ADMIN !== 'false';
    if (shouldSeed) {
      seedAdmin().catch((e) => console.warn('Seed admin failed:', e?.message || e));
    }
    startServer();
  })
  .catch((error) => {
    console.warn('⚠️ Database connection failed. Starting server without database...');
    console.warn('💡 Make sure PostgreSQL is running and configured properly');
    console.warn('📖 Check POSTGRESQL_SETUP.md for setup instructions');
    console.warn('Database error:', error.message);
    
    // Start server without database for development
    startServer();
  });