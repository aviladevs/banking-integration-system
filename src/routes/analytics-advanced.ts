import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { Transaction } from '../entities/Transaction';
import { BankAccount } from '../entities/BankAccount';
import { Between, MoreThan } from 'typeorm';

const router = Router();
const transactionRepository = AppDataSource.getRepository(Transaction);
const bankAccountRepository = AppDataSource.getRepository(BankAccount);

// Analytics por categoria
router.get('/expenses-by-category', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate 
      ? Between(new Date(startDate as string), new Date(endDate as string))
      : MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Últimos 30 dias

    const transactions = await transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.bankAccount', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.amount < 0') // Apenas gastos
      .andWhere('transaction.transactionDate > :date', { date: dateFilter })
      .select([
        'transaction.category',
        'SUM(ABS(transaction.amount)) as totalAmount',
        'COUNT(*) as transactionCount'
      ])
      .groupBy('transaction.category')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    const categories = transactions.map(t => ({
      category: t.transaction_category || 'Outros',
      amount: parseFloat(t.totalAmount) || 0,
      count: parseInt(t.transactionCount) || 0
    }));

    return res.json({
      period: { startDate, endDate },
      totalCategories: categories.length,
      totalAmount: categories.reduce((sum, cat) => sum + cat.amount, 0),
      categories
    });
  } catch (error) {
    console.error('Analytics by category error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Evolução temporal de gastos
router.get('/spending-trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'monthly' } = req.query; // daily, weekly, monthly

    let dateFormat: string;
    let dateRange: Date;

    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias
        break;
      case 'weekly':
        dateFormat = '%Y-%u'; // Ano-semana
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 dias
        break;
      default:
        dateFormat = '%Y-%m';
        dateRange = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 ano
    }

    const trends = await transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.bankAccount', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.transactionDate > :date', { date: dateRange })
      .select([
        `DATE_FORMAT(transaction.transactionDate, '${dateFormat}') as period`,
        'SUM(CASE WHEN transaction.amount < 0 THEN ABS(transaction.amount) ELSE 0 END) as expenses',
        'SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END) as income',
        'COUNT(*) as transactionCount'
      ])
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const formattedTrends = trends.map(trend => ({
      period: trend.period,
      expenses: parseFloat(trend.expenses) || 0,
      income: parseFloat(trend.income) || 0,
      balance: (parseFloat(trend.income) || 0) - (parseFloat(trend.expenses) || 0),
      transactionCount: parseInt(trend.transactionCount) || 0
    }));

    return res.json({
      period,
      totalPeriods: formattedTrends.length,
      trends: formattedTrends,
      summary: {
        totalIncome: formattedTrends.reduce((sum, t) => sum + t.income, 0),
        totalExpenses: formattedTrends.reduce((sum, t) => sum + t.expenses, 0),
        avgMonthlyBalance: formattedTrends.reduce((sum, t) => sum + t.balance, 0) / formattedTrends.length
      }
    });
  } catch (error) {
    console.error('Spending trends error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Comparativo entre contas
router.get('/account-comparison', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { months = 3 } = req.query;
    
    const dateLimit = new Date(Date.now() - (parseInt(months as string) * 30 * 24 * 60 * 60 * 1000));

    const accountStats = await bankAccountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction', 'transaction.transactionDate > :dateLimit', { dateLimit })
      .where('account.userId = :userId', { userId })
      .select([
        'account.id',
        'account.bankName',
        'account.accountType',
        'account.balance',
        'COUNT(transaction.id) as transactionCount',
        'SUM(CASE WHEN transaction.amount > 0 THEN transaction.amount ELSE 0 END) as totalIncome',
        'SUM(CASE WHEN transaction.amount < 0 THEN ABS(transaction.amount) ELSE 0 END) as totalExpenses',
        'AVG(ABS(transaction.amount)) as avgTransactionAmount'
      ])
      .groupBy('account.id')
      .getRawMany();

    const comparison = accountStats.map(account => ({
      id: account.account_id,
      bankName: account.account_bankName,
      accountType: account.account_accountType,
      currentBalance: parseFloat(account.account_balance) || 0,
      transactionCount: parseInt(account.transactionCount) || 0,
      totalIncome: parseFloat(account.totalIncome) || 0,
      totalExpenses: parseFloat(account.totalExpenses) || 0,
      avgTransactionAmount: parseFloat(account.avgTransactionAmount) || 0,
      netFlow: (parseFloat(account.totalIncome) || 0) - (parseFloat(account.totalExpenses) || 0)
    }));

    return res.json({
      period: `Last ${months} months`,
      accountCount: comparison.length,
      totalBalance: comparison.reduce((sum, acc) => sum + acc.currentBalance, 0),
      accounts: comparison,
      summary: {
        mostActiveAccount: comparison.reduce((prev, curr) => 
          curr.transactionCount > prev.transactionCount ? curr : prev, comparison[0]),
        highestBalance: comparison.reduce((prev, curr) => 
          curr.currentBalance > prev.currentBalance ? curr : prev, comparison[0])
      }
    });
  } catch (error) {
    console.error('Account comparison error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Alertas e insights inteligentes
router.get('/smart-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const insights = [];

    // Verificar gastos incomuns
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const previousMonth = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const currentMonthExpenses = await transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.bankAccount', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.amount < 0')
      .andWhere('transaction.transactionDate > :date', { date: lastMonth })
      .select('SUM(ABS(transaction.amount))', 'total')
      .getRawOne();

    const previousMonthExpenses = await transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.bankAccount', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.amount < 0')
      .andWhere('transaction.transactionDate BETWEEN :start AND :end', { 
        start: previousMonth, 
        end: lastMonth 
      })
      .select('SUM(ABS(transaction.amount))', 'total')
      .getRawOne();

    const currentTotal = parseFloat(currentMonthExpenses?.total) || 0;
    const previousTotal = parseFloat(previousMonthExpenses?.total) || 0;

    if (currentTotal > previousTotal * 1.2) {
      insights.push({
        type: 'warning',
        title: 'Gastos Aumentaram',
        message: `Seus gastos aumentaram ${((currentTotal / previousTotal - 1) * 100).toFixed(1)}% em relação ao mês anterior`,
        amount: currentTotal - previousTotal,
        action: 'Revisar categorias de gastos'
      });
    }

    // Verificar contas com saldo baixo
    const lowBalanceAccounts = await bankAccountRepository
      .createQueryBuilder('account')
      .where('account.userId = :userId', { userId })
      .andWhere('account.balance < :threshold', { threshold: 1000 })
      .andWhere('account.isActive = true')
      .getMany();

    if (lowBalanceAccounts.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Saldo Baixo',
        message: `${lowBalanceAccounts.length} conta(s) com saldo abaixo de R$ 1.000`,
        accounts: lowBalanceAccounts.map(acc => ({
          bank: acc.bankName,
          balance: acc.balance
        })),
        action: 'Considerar transferências entre contas'
      });
    }

    // Sugestão de economia
    const topExpenseCategory = await transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.bankAccount', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.amount < 0')
      .andWhere('transaction.transactionDate > :date', { date: lastMonth })
      .select([
        'transaction.category',
        'SUM(ABS(transaction.amount)) as total'
      ])
      .groupBy('transaction.category')
      .orderBy('total', 'DESC')
      .limit(1)
      .getRawOne();

    if (topExpenseCategory) {
      insights.push({
        type: 'suggestion',
        title: 'Oportunidade de Economia',
        message: `Categoria "${topExpenseCategory.transaction_category}" representa sua maior despesa`,
        amount: parseFloat(topExpenseCategory.total),
        action: `Revisar gastos em ${topExpenseCategory.transaction_category}`
      });
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      insightCount: insights.length,
      insights
    });
  } catch (error) {
    console.error('Smart insights error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard consolidado
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Resumo geral
    const [accounts, recentTransactions] = await Promise.all([
      bankAccountRepository.find({ 
        where: { userId, isActive: true },
        relations: ['transactions']
      }),
      transactionRepository.find({
        where: { 
          bankAccount: { userId },
          transactionDate: MoreThan(last30Days)
        },
        order: { transactionDate: 'DESC' },
        take: 10,
        relations: ['bankAccount']
      })
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalTransactions = recentTransactions.length;
    const totalIncome = recentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return res.json({
      summary: {
        totalBalance,
        accountCount: accounts.length,
        totalTransactions,
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses
      },
      accounts: accounts.map(acc => ({
        id: acc.id,
        bankName: acc.bankName,
        accountType: acc.accountType,
        balance: acc.balance,
        transactionCount: acc.transactions?.length || 0
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        category: t.category,
        date: t.transactionDate,
        bankName: t.bankAccount?.bankName
      })),
      period: 'Last 30 days'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;