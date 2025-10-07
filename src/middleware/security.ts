import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Password strength validation
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Check length
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Senha deve ter pelo menos 8 caracteres');
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclua pelo menos uma letra maiúscula');
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclua pelo menos uma letra minúscula');
  }

  // Check for numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclua pelo menos um número');
  }

  // Check for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Inclua pelo menos um caractere especial');
  }

  // Check for common patterns
  const commonPatterns = [
    /123/,
    /abc/,
    /qwerty/,
    /password/i,
    /admin/i,
    /user/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score -= 1;
    feedback.push('Evite sequências ou palavras comuns');
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Evite caracteres repetidos');
  }

  const isStrong = score >= 4;

  if (isStrong && feedback.length === 0) {
    feedback.push('Senha forte! ✅');
  }

  return {
    score: Math.max(0, Math.min(4, score)),
    feedback,
    isStrong
  };
}

// Password validation middleware
export function requireStrongPassword(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Senha é obrigatória' });
    return;
  }

  const strength = validatePasswordStrength(password);

  if (!strength.isStrong) {
    res.status(400).json({
      error: 'Senha muito fraca',
      feedback: strength.feedback,
      score: strength.score
    });
    return;
  }

  next();
}

// Rate limiting configurations
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset attempts per hour
  message: {
    error: 'Muitas tentativas de redefinição de senha. Tente novamente em 1 hora.',
    retryAfter: 60 * 60
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Muitas requisições à API. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  }
});

// Security audit logging
export interface SecurityAuditLog {
  timestamp: Date;
  action: string;
  userId?: string;
  ip: string;
  userAgent: string;
  risk: 'low' | 'medium' | 'high';
  details?: any;
}

const auditLogs: SecurityAuditLog[] = [];

export function logSecurityEvent(
  req: Request,
  action: string,
  risk: SecurityAuditLog['risk'] = 'low',
  details?: any
): void {
  const log: SecurityAuditLog = {
    timestamp: new Date(),
    action,
    userId: (req as any).user?.id,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    risk,
    details
  };

  auditLogs.push(log);

  // Keep only last 1000 logs in memory
  if (auditLogs.length > 1000) {
    auditLogs.splice(0, auditLogs.length - 1000);
  }

  // Log high-risk events to console
  if (risk === 'high') {
    console.warn('🚨 High-risk security event:', log);
  } else if (risk === 'medium') {
    console.warn('⚠️ Medium-risk security event:', log);
  }
}

export function getAuditLogs(
  limit: number = 100,
  risk?: SecurityAuditLog['risk']
): SecurityAuditLog[] {
  let logs = [...auditLogs];

  if (risk) {
    logs = logs.filter(log => log.risk === risk);
  }

  return logs
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

export function getSecurityStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentLogs = auditLogs.filter(log => log.timestamp >= last24h);
  const weeklyLogs = auditLogs.filter(log => log.timestamp >= lastWeek);

  return {
    total: auditLogs.length,
    last24h: recentLogs.length,
    lastWeek: weeklyLogs.length,
    riskBreakdown: {
      high: auditLogs.filter(log => log.risk === 'high').length,
      medium: auditLogs.filter(log => log.risk === 'medium').length,
      low: auditLogs.filter(log => log.risk === 'low').length
    },
    recentHighRisk: auditLogs
      .filter(log => log.risk === 'high' && log.timestamp >= last24h)
      .slice(0, 10)
  };
}

// Security middleware
export function auditSecurity(action: string, risk: SecurityAuditLog['risk'] = 'low') {
  return (req: Request, _res: Response, next: NextFunction) => {
    logSecurityEvent(req, action, risk);
    next();
  };
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Sanitize common injection patterns
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
}

export function checkSuspiciousActivity(req: Request, _res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /curl.*bot/i,
    /wget/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || pattern.test(ip)
  );

  if (isSuspicious) {
    logSecurityEvent(req, 'suspicious_activity_detected', 'high', {
      userAgent,
      ip,
      path: req.path,
      method: req.method
    });
  }

  // Check for unusual request patterns
  const path = req.path.toLowerCase();
  const suspiciousPaths = [
    'admin',
    'phpmyadmin',
    'wp-admin',
    'wp-login',
    '.env',
    'config',
    'backup'
  ];

  const hasSuspiciousPath = suspiciousPaths.some(sp => path.includes(sp));
  
  if (hasSuspiciousPath) {
    logSecurityEvent(req, 'suspicious_path_access', 'medium', {
      path: req.path,
      method: req.method
    });
  }

  next();
}