import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user notifications
router.get('/', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    
    
    // This would be connected to the NotificationService instance
    // For now, returning mock data structure
    const notifications = [
      {
        id: 'notif_1',
        type: 'transaction',
        title: 'Nova Transação',
        message: 'Débito de R$ 150,00 - Compra no supermercado',
        timestamp: new Date(),
        read: false,
        priority: 'medium',
        actionUrl: '/transactions/123'
      }
    ];

    return res.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      totalCount: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    
    const notificationId = req.params.id;

    // This would mark the notification as read in the NotificationService
    // For now, just returning success
    
    return res.json({ 
      message: 'Notification marked as read',
      notificationId 
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    

    // This would mark all notifications as read in the NotificationService
    
    return res.json({ 
      message: 'All notifications marked as read' 
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    
    const notificationId = req.params.id;

    // This would delete the notification from the NotificationService
    
    return res.json({ 
      message: 'Notification deleted',
      notificationId 
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    

    // Mock notification settings
    const settings = {
      transactionNotifications: true,
      securityAlerts: true,
      lowBalanceAlerts: true,
      monthlyReports: true,
      emailNotifications: false,
      pushNotifications: true,
      alertThresholds: {
        lowBalance: 1000,
        highTransaction: 5000
      }
    };

    return res.json(settings);
  } catch (error) {
    console.error('Get notification settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification settings
router.put('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    
    const settings = req.body;

    // This would update user notification preferences
    
    return res.json({ 
      message: 'Notification settings updated',
      settings 
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Test notification (for development)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    
    const { type = 'test', title = 'Teste', message = 'Esta é uma notificação de teste' } = req.body;

    // This would send a test notification via NotificationService
    
    return res.json({ 
      message: 'Test notification sent',
      notification: {
        type,
        title,
        message,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;