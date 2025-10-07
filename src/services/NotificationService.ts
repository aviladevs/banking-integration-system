import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface NotificationData {
  id: string;
  type: 'transaction' | 'security' | 'reminder' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  data?: any;
}

class NotificationService {
  private io: SocketServer;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private notifications: Map<string, NotificationData[]> = new Map(); // userId -> notifications[]

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use((socket: any, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userEmail} connected via socket ${socket.id}`);

      if (socket.userId) {
        // Add socket to user's socket list
        const userSockets = this.userSockets.get(socket.userId) || [];
        userSockets.push(socket.id);
        this.userSockets.set(socket.userId, userSockets);

        // Send pending notifications
        this.sendPendingNotifications(socket.userId, socket.id);

        // Join user to their personal room
        socket.join(`user_${socket.userId}`);
      }

      // Handle notification acknowledgment
      socket.on('notification_read', (notificationId: string) => {
        if (socket.userId) {
          this.markNotificationAsRead(socket.userId, notificationId);
        }
      });

      // Handle mark all as read
      socket.on('mark_all_read', () => {
        if (socket.userId) {
          this.markAllNotificationsAsRead(socket.userId);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userEmail} disconnected`);
        if (socket.userId) {
          const userSockets = this.userSockets.get(socket.userId) || [];
          const updatedSockets = userSockets.filter(id => id !== socket.id);
          if (updatedSockets.length > 0) {
            this.userSockets.set(socket.userId, updatedSockets);
          } else {
            this.userSockets.delete(socket.userId);
          }
        }
      });
    });
  }

  // Send notification to specific user
  public sendNotification(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) {
    const fullNotification: NotificationData = {
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      ...notification
    };

    // Store notification
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(fullNotification);
    
    // Keep only last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(100);
    }
    
    this.notifications.set(userId, userNotifications);

    // Send to all user's connected sockets
    this.io.to(`user_${userId}`).emit('new_notification', fullNotification);

    return fullNotification;
  }

  // Send transaction notification
  public sendTransactionNotification(userId: string, transaction: any) {
    const isIncome = transaction.amount > 0;
    const notification = this.sendNotification(userId, {
      type: 'transaction',
      title: isIncome ? 'Dinheiro Recebido!' : 'Transação Realizada',
      message: `${isIncome ? 'Crédito' : 'Débito'} de R$ ${Math.abs(transaction.amount).toFixed(2)} - ${transaction.description}`,
      priority: transaction.amount > 1000 ? 'high' : 'medium',
      actionUrl: `/transactions/${transaction.id}`,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        type: transaction.type
      }
    });

    return notification;
  }

  // Send security alert
  public sendSecurityAlert(userId: string, alertType: string, details: string) {
    return this.sendNotification(userId, {
      type: 'security',
      title: 'Alerta de Segurança',
      message: `${alertType}: ${details}`,
      priority: 'urgent',
      actionUrl: '/security/settings'
    });
  }

  // Send low balance alert
  public sendLowBalanceAlert(userId: string, bankName: string, balance: number) {
    return this.sendNotification(userId, {
      type: 'alert',
      title: 'Saldo Baixo',
      message: `Sua conta ${bankName} está com saldo baixo: R$ ${balance.toFixed(2)}`,
      priority: 'high',
      actionUrl: '/accounts'
    });
  }

  // Send reminder
  public sendReminder(userId: string, title: string, message: string, actionUrl?: string) {
    const notificationData: Omit<NotificationData, 'id' | 'timestamp' | 'read'> = {
      type: 'reminder',
      title,
      message,
      priority: 'medium'
    };
    
    if (actionUrl) {
      notificationData.actionUrl = actionUrl;
    }
    
    return this.sendNotification(userId, notificationData);
  }

  // Get all notifications for user
  public getUserNotifications(userId: string): NotificationData[] {
    return this.notifications.get(userId) || [];
  }

  // Get unread notifications count
  public getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  // Mark notification as read
  public markNotificationAsRead(userId: string, notificationId: string) {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  // Mark all notifications as read
  public markAllNotificationsAsRead(userId: string) {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(n => n.read = true);
  }

  // Send pending notifications when user connects
  private sendPendingNotifications(userId: string, socketId: string) {
    const userNotifications = this.notifications.get(userId) || [];
    const unreadNotifications = userNotifications.filter(n => !n.read);
    
    if (unreadNotifications.length > 0) {
      this.io.to(socketId).emit('pending_notifications', {
        notifications: unreadNotifications,
        unreadCount: unreadNotifications.length
      });
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check and send automated alerts
  public async checkAutomatedAlerts(userId: string, bankAccounts: any[]) {
    // Check for low balance
    for (const account of bankAccounts) {
      if (account.balance < 1000 && account.isActive) {
        this.sendLowBalanceAlert(userId, account.bankName, account.balance);
      }
    }

    // Check for unusual spending (this would be called periodically)
    // Implementation would depend on your analytics
  }

  // Broadcast system announcement
  public broadcastAnnouncement(title: string, message: string) {
    this.io.emit('system_announcement', {
      id: this.generateId(),
      type: 'announcement',
      title,
      message,
      timestamp: new Date(),
      priority: 'medium'
    });
  }

  // Get Socket.IO instance for other services
  public getIO(): SocketServer {
    return this.io;
  }
}

export default NotificationService;