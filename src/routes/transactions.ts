import { Router, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Transaction } from '../entities/Transaction';
import { BankAccount } from '../entities/BankAccount';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const transactionRepository = AppDataSource.getRepository(Transaction);
const bankAccountRepository = AppDataSource.getRepository(BankAccount);

// Get all user transactions
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, accountId, type, startDate, endDate } = req.query;

    // Build query
    const queryBuilder = transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.bankAccount', 'bankAccount')
      .where('bankAccount.userId = :userId', { userId: req.user!.id });

    // Add filters
    if (accountId) {
      queryBuilder.andWhere('transaction.bankAccountId = :accountId', { accountId });
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    // Pagination
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    queryBuilder.orderBy('transaction.transactionDate', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return res.json({
      transactions,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific transaction
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await transactionRepository.findOne({
      where: { id: req.params.id },
      relations: ['bankAccount'],
    });

    if (!transaction || transaction.bankAccount.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new transaction
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      description,
      amount,
      type,
      bankAccountId,
      category,
      subcategory,
      transactionDate,
    } = req.body;

    // Verify bank account belongs to user
    const bankAccount = await bankAccountRepository.findOne({
      where: { id: bankAccountId, userId: req.user!.id },
    });

    if (!bankAccount) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Create transaction
    const transaction = transactionRepository.create({
      description,
      amount: parseFloat(amount),
      type,
      bankAccountId,
      category,
      subcategory,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
    });

    await transactionRepository.save(transaction);

    // Update account balance
    if (type === 'credit') {
      bankAccount.balance = parseFloat(bankAccount.balance.toString()) + parseFloat(amount);
    } else if (type === 'debit') {
      bankAccount.balance = parseFloat(bankAccount.balance.toString()) - parseFloat(amount);
    }

    await bankAccountRepository.save(bankAccount);

    return res.status(201).json({
      message: 'Transaction added successfully',
      transaction,
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
