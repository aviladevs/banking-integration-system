import { Router, Response } from 'express';
import { AppDataSource } from '../data-source';
import { BankAccount } from '../entities/BankAccount';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const bankAccountRepository = AppDataSource.getRepository(BankAccount);

// Get all user bank accounts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await bankAccountRepository.find({
      where: { userId: req.user!.id },
      relations: ['transactions'],
      order: { createdAt: 'DESC' },
    });

    res.json(accounts);
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific bank account
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const account = await bankAccountRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
      relations: ['transactions'],
    });

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    return res.json(account);
  } catch (error) {
    console.error('Get bank account error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new bank account
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      accountNumber,
      agency,
      accountType,
      bankType,
      bankName,
    } = req.body;

    // Check if account already exists
    const existingAccount = await bankAccountRepository.findOne({
      where: {
        accountNumber,
        agency,
        bankType,
        userId: req.user!.id,
      },
    });

    if (existingAccount) {
      return res.status(400).json({ error: 'Bank account already exists' });
    }

    // Create new account
    const account = bankAccountRepository.create({
      accountNumber,
      agency,
      accountType,
      bankType,
      bankName,
      userId: req.user!.id,
    });

    await bankAccountRepository.save(account);

    return res.status(201).json({
      message: 'Bank account added successfully',
      account,
    });
  } catch (error) {
    console.error('Add bank account error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bank account
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, balance } = req.body;

    const account = await bankAccountRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Update account data
    if (typeof isActive === 'boolean') account.isActive = isActive;
    if (typeof balance === 'number') account.balance = balance;

    await bankAccountRepository.save(account);

    return res.json({
      message: 'Bank account updated successfully',
      account,
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete bank account
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const account = await bankAccountRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    await bankAccountRepository.remove(account);

    return res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;