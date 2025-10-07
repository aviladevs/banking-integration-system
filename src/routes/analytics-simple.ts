import { Router, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Transaction } from '../entities/Transaction';
import { BankAccount } from '../entities/BankAccount';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get financial summary
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select('transaction')
      .from(Transaction, 'transaction')
      .leftJoin('transaction.bankAccount', 'bankAccount')
      .where('bankAccount.userId = :userId', { userId: req.user!.id });

    if (startDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.transactionDate <= :endDate', { endDate });
    }

    const transactions = await queryBuilder.getMany();
    
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      averageTransaction: 0,
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount.toString());
      
      if (transaction.type === 'credit') {
        summary.totalIncome += amount;
      } else if (transaction.type === 'debit') {
        summary.totalExpenses += amount;
      }

      // By category
      const category = transaction.category || 'Uncategorized';
      summary.byCategory[category] = (summary.byCategory[category] || 0) + amount;

      // By type
      summary.byType[transaction.type] = (summary.byType[transaction.type] || 0) + amount;
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;
    summary.averageTransaction = transactions.length > 0 ? 
      (summary.totalIncome + summary.totalExpenses) / transactions.length : 0;

    res.json(summary);
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly trends
router.get('/trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions t
      JOIN bank_accounts ba ON t.bank_account_id = ba.id
      WHERE ba.user_id = $1
        AND transaction_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', transaction_date), type
      ORDER BY month DESC
    `;

    const results = await AppDataSource.query(query, [req.user!.id]);
    
    res.json(results);
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get account balances chart data
router.get('/balances-chart', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await AppDataSource.getRepository(BankAccount).find({
      where: { userId: req.user!.id, isActive: true },
      select: ['id', 'bankName', 'accountType', 'balance'],
    });

    const chartData = accounts.map(account => ({
      name: `${account.bankName} - ${account.accountType}`,
      value: parseFloat(account.balance.toString()),
      bankName: account.bankName,
      accountType: account.accountType,
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Get balances chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;