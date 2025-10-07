import { Router, Response } from 'express';
import { AppDataSource } from '../data-source';
import { BankConnection } from '../entities/BankConnection';
import { BankAccount } from '../entities/BankAccount';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const bankConnectionRepository = AppDataSource.getRepository(BankConnection);
const bankAccountRepository = AppDataSource.getRepository(BankAccount);

// Get all bank connections
router.get('/connections', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const connections = await bankConnectionRepository.find({
      where: { userId: req.user!.id },
      order: { createdAt: 'DESC' },
    });

    return res.json(connections);
  } catch (error) {
    console.error('erro de connection do banco:', error);
    return res.status(500).json({ error: 'Deu erro' });
  }
});

// Connect to a bank
router.post('/connect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bankType, bankName } = req.body;

    // Check if connection already exists
    const existingConnection = await bankConnectionRepository.findOne({
      where: { bankType, userId: req.user!.id },
    });

    if (existingConnection) {
      return res.status(400).json({ error: 'Bank connection already exists' });
    }

    // Create new connection
    const connection = bankConnectionRepository.create({
      bankType,
      bankName,
      userId: req.user!.id,
    });

    await bankConnectionRepository.save(connection);

    return res.status(201).json({
      message: 'Bank connection created successfully',
      connection,
    });
  } catch (error) {
    console.error('Connect bank error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get balances from all connected accounts
router.get('/balances', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await bankAccountRepository.find({
      where: { userId: req.user!.id, isActive: true },
      select: ['id', 'bankType', 'bankName', 'accountType', 'balance', 'lastSyncAt'],
    });

    const totalBalance = accounts.reduce((sum, account) => {
      return sum + parseFloat(account.balance.toString());
    }, 0);

    return res.json({
      accounts,
      totalBalance,
      summary: {
        totalAccounts: accounts.length,
        connectedAccounts: accounts.filter(acc => acc.lastSyncAt).length,
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get balances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync data from banks
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const connections = await bankConnectionRepository.find({
      where: { userId: req.user!.id, isActive: true },
    });

    const syncResults = [];

    for (const connection of connections) {
      try {
        // Here you would implement actual bank API integration
        // For now, we'll just update the lastSyncAt timestamp
        connection.lastSyncAt = new Date();
        await bankConnectionRepository.save(connection);

        syncResults.push({
          bankType: connection.bankType,
          bankName: connection.bankName,
          status: 'success',
          message: 'Data synchronized successfully',
        });
      } catch (error) {
        syncResults.push({
          bankType: connection.bankType,
          bankName: connection.bankName,
          status: 'error',
          message: 'Failed to synchronize data',
        });
      }
    }

    return res.json({
      message: 'Synchronization completed',
      results: syncResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync banks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect from a bank
router.delete('/connections/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await bankConnectionRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Bank connection not found' });
    }

    await bankConnectionRepository.remove(connection);

    return res.json({ message: 'Bank connection removed successfully' });
  } catch (error) {
    console.error('Disconnect bank error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
