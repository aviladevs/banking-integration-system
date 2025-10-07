import express from 'express';
import BackupService from '../services/BackupService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Initialize backup service
const backupService = new BackupService({
    frequency: 'daily',
    retentionDays: 30,
    includeFiles: true,
    compression: true
});

// Get backup statistics and configuration
router.get('/stats', authenticateToken, async (_req, res) => {
    try {
        const stats = backupService.getBackupStats();
        res.json(stats);
    } catch (error) {
        console.error('Failed to get backup stats:', error);
        res.status(500).json({ 
            error: 'Failed to get backup statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get backup history
router.get('/history', authenticateToken, async (_req, res) => {
    try {
        const history = backupService.getBackupHistory();
        res.json(history);
    } catch (error) {
        console.error('Failed to get backup history:', error);
        res.status(500).json({ 
            error: 'Failed to get backup history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create manual backup
router.post('/create', authenticateToken, async (_req, res) => {
    try {
        const result = await backupService.createBackup('manual');
        res.json({
            message: 'Backup created successfully',
            backup: result
        });
    } catch (error) {
        console.error('Failed to create backup:', error);
        res.status(500).json({ 
            error: 'Failed to create backup',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Restore from backup
router.post('/restore/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        await backupService.restoreBackup(backupId);
        
        res.json({
            message: 'Backup restored successfully',
            backupId
        });
    } catch (error) {
        console.error('Failed to restore backup:', error);
        res.status(500).json({ 
            error: 'Failed to restore backup',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update backup configuration
router.put('/config', authenticateToken, async (req, res) => {
    try {
        const { frequency, retentionDays, includeFiles, compression } = req.body;
        
        const validFrequencies = ['daily', 'weekly', 'monthly'];
        if (frequency && !validFrequencies.includes(frequency)) {
            res.status(400).json({
                error: 'Invalid frequency. Must be daily, weekly, or monthly'
            });
            return;
        }

        if (retentionDays && (retentionDays < 1 || retentionDays > 365)) {
            res.status(400).json({
                error: 'Retention days must be between 1 and 365'
            });
            return;
        }

        const newConfig = {
            ...(frequency && { frequency }),
            ...(retentionDays && { retentionDays }),
            ...(includeFiles !== undefined && { includeFiles }),
            ...(compression !== undefined && { compression })
        };

        backupService.updateConfig(newConfig);
        
        res.json({
            message: 'Backup configuration updated successfully',
            config: newConfig
        });
    } catch (error) {
        console.error('Failed to update backup config:', error);
        res.status(500).json({ 
            error: 'Failed to update backup configuration',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Download backup file
router.get('/download/:backupId', authenticateToken, async (req, res) => {
    try {
        const { backupId } = req.params;
        const history = backupService.getBackupHistory();
        const backup = history.find(b => b.id === backupId);
        
        if (!backup) {
            res.status(404).json({ error: 'Backup not found' });
            return;
        }

        if (backup.status !== 'success') {
            res.status(400).json({ error: 'Cannot download failed backup' });
            return;
        }

        res.download(backup.path, `${backupId}.tar.gz`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Failed to download backup' });
            }
        });
    } catch (error) {
        console.error('Failed to download backup:', error);
        res.status(500).json({ 
            error: 'Failed to download backup',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Backup health check
router.get('/health', async (_req, res) => {
    try {
        const stats = backupService.getBackupStats();
        const isHealthy = stats.lastBackup && 
                         stats.lastBackup.status === 'success' &&
                         new Date().getTime() - new Date(stats.lastBackup.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days

        res.json({
            healthy: isHealthy,
            message: isHealthy ? 'Backup system is healthy' : 'Backup system needs attention',
            lastBackup: stats.lastBackup,
            nextBackup: stats.nextBackup
        });
    } catch (error) {
        console.error('Failed to check backup health:', error);
        res.status(500).json({ 
            error: 'Failed to check backup health',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;