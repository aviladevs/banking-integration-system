import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validatePasswordStrength, getSecurityStats } from '../middleware/security';

const router = express.Router();

// Validate password strength
router.post('/validate-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      res.status(400).json({ error: 'Senha é obrigatória' });
      return;
    }

    const validation = validatePasswordStrength(password);
    res.json(validation);
  } catch (error) {
    console.error('Password validation error:', error);
    res.status(500).json({ 
      error: 'Erro ao validar senha',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get security statistics
router.get('/stats', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const stats = getSecurityStats();
    res.json(stats);
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ 
      error: 'Erro ao obter estatísticas de segurança',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Security audit logs
router.get('/audit-logs', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    // Mock audit logs for now
    const logs: any[] = [];
    
    res.json({
      logs,
      pagination: {
        total: logs.length,
        page: 1,
        limit: 50
      },
      summary: {
        total: logs.length,
        recentHighRisk: 0,
        recentFailures: 0,
        uniqueIPs: 0
      }
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ 
      error: 'Erro ao obter logs de auditoria',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Security report
router.get('/report', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const report = {
      userId,
      timestamp: new Date(),
      riskLevel: 'low',
      summary: {
        totalEvents: 0,
        highRiskEvents: 0,
        mediumRiskEvents: 0,
        lowRiskEvents: 0
      },
      recommendations: [
        'Mantenha sua senha forte',
        'Ative a autenticação de dois fatores quando disponível',
        'Monitore regularmente atividades suspeitas'
      ]
    };

    res.json(report);
  } catch (error) {
    console.error('Security report error:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de segurança',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;