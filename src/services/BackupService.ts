import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface BackupConfig {
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    backupPath: string;
    includeFiles: boolean;
    compression: boolean;
}

interface BackupResult {
    id: string;
    timestamp: Date;
    size: number;
    type: 'auto' | 'manual';
    status: 'success' | 'failed';
    path: string;
    duration: number;
    error?: string;
}

class BackupService {
    private config: BackupConfig;
    private backupHistory: BackupResult[] = [];
    private isRunning = false;

    constructor(config?: Partial<BackupConfig>) {
        this.config = {
            frequency: 'daily',
            retentionDays: 30,
            backupPath: path.join(process.cwd(), 'backups'),
            includeFiles: true,
            compression: true,
            ...config
        };

        this.init();
    }

    private async init() {
        // Create backup directory if it doesn't exist
        try {
            await fs.mkdir(this.config.backupPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create backup directory:', error);
        }

        // Load backup history
        await this.loadBackupHistory();

        // Schedule automatic backups
        this.scheduleBackups();
    }

    private scheduleBackups() {
        let cronPattern: string;

        switch (this.config.frequency) {
            case 'daily':
                cronPattern = '0 2 * * *'; // 2 AM daily
                break;
            case 'weekly':
                cronPattern = '0 2 * * 0'; // 2 AM every Sunday
                break;
            case 'monthly':
                cronPattern = '0 2 1 * *'; // 2 AM on the 1st of every month
                break;
            default:
                cronPattern = '0 2 * * *';
        }

        cron.schedule(cronPattern, async () => {
            console.log('🔄 Starting scheduled backup...');
            await this.createBackup('auto');
        });

        console.log(`📅 Backup scheduled: ${this.config.frequency} at 2 AM`);
    }

    async createBackup(type: 'auto' | 'manual' = 'manual'): Promise<BackupResult> {
        if (this.isRunning) {
            throw new Error('Backup already in progress');
        }

        this.isRunning = true;
        const startTime = Date.now();
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date();

        try {
            console.log(`🚀 Starting ${type} backup: ${backupId}`);

            // Create database backup
            const dbBackupPath = await this.backupDatabase(backupId);
            
            // Create files backup if enabled
            let filesBackupPath: string | null = null;
            if (this.config.includeFiles) {
                filesBackupPath = await this.backupFiles(backupId);
            }

            // Create combined backup archive
            const finalBackupPath = await this.createBackupArchive(
                backupId, 
                dbBackupPath, 
                filesBackupPath
            );

            // Get backup size
            const stats = await fs.stat(finalBackupPath);
            const size = stats.size;

            const result: BackupResult = {
                id: backupId,
                timestamp,
                size,
                type,
                status: 'success',
                path: finalBackupPath,
                duration: Date.now() - startTime
            };

            this.backupHistory.unshift(result);
            await this.saveBackupHistory();

            // Clean up old backups
            await this.cleanupOldBackups();

            console.log(`✅ Backup completed: ${backupId} (${this.formatSize(size)})`);
            return result;

        } catch (error) {
            const result: BackupResult = {
                id: backupId,
                timestamp,
                size: 0,
                type,
                status: 'failed',
                path: '',
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };

            this.backupHistory.unshift(result);
            await this.saveBackupHistory();

            console.error(`❌ Backup failed: ${backupId}`, error);
            throw error;

        } finally {
            this.isRunning = false;
        }
    }

    private async backupDatabase(backupId: string): Promise<string> {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const backupPath = path.join(this.config.backupPath, `${backupId}_database`);

        if (dbType === 'postgres' || dbType === 'postgresql') {
            return this.backupPostgreSQL(backupPath);
        } else {
            return this.backupSQLite(backupPath);
        }
    }

    private async backupPostgreSQL(backupPath: string): Promise<string> {
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';
        const dbName = process.env.DB_DATABASE || 'banking_system';
        const dbUser = process.env.DB_USERNAME || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || '';

        const dumpFile = `${backupPath}.sql`;
        
        // Set password environment variable for pg_dump
        const env = { ...process.env, PGPASSWORD: dbPassword };
        
        const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${dumpFile}" --no-password`;
        
        try {
            execSync(command, { env });
            console.log('✅ PostgreSQL database backup completed');
            return dumpFile;
        } catch (error) {
            console.error('❌ PostgreSQL backup failed:', error);
            throw new Error(`PostgreSQL backup failed: ${error}`);
        }
    }

    private async backupSQLite(backupPath: string): Promise<string> {
        const dbPath = path.join(process.cwd(), 'database.sqlite');
        const backupFile = `${backupPath}.sqlite`;

        try {
            await fs.copyFile(dbPath, backupFile);
            console.log('✅ SQLite database backup completed');
            return backupFile;
        } catch (error) {
            console.error('❌ SQLite backup failed:', error);
            throw new Error(`SQLite backup failed: ${error}`);
        }
    }

    private async backupFiles(backupId: string): Promise<string> {
        const backupPath = path.join(this.config.backupPath, `${backupId}_files`);
        await fs.mkdir(backupPath, { recursive: true });

        // Define important directories to backup
        const importantDirs = [
            'public',
            'uploads',
            'logs',
            'certificates'
        ];

        for (const dir of importantDirs) {
            const sourcePath = path.join(process.cwd(), dir);
            const targetPath = path.join(backupPath, dir);

            try {
                await fs.access(sourcePath);
                await this.copyDirectory(sourcePath, targetPath);
                console.log(`✅ Backed up directory: ${dir}`);
            } catch (error) {
                console.log(`⚠️ Directory not found (skipping): ${dir}`);
            }
        }

        return backupPath;
    }

    private async copyDirectory(source: string, target: string): Promise<void> {
        await fs.mkdir(target, { recursive: true });
        
        const items = await fs.readdir(source);
        
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);
            
            const stat = await fs.stat(sourcePath);
            
            if (stat.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                await fs.copyFile(sourcePath, targetPath);
            }
        }
    }

    private async createBackupArchive(
        backupId: string, 
        dbBackupPath: string, 
        filesBackupPath: string | null
    ): Promise<string> {
        if (!this.config.compression) {
            return dbBackupPath; // Return database backup without compression
        }

        const archivePath = path.join(this.config.backupPath, `${backupId}.tar.gz`);
        
        try {
            let command = `tar -czf "${archivePath}" -C "${this.config.backupPath}"`;
            
            // Add database backup
            const dbFileName = path.basename(dbBackupPath);
            command += ` "${dbFileName}"`;
            
            // Add files backup if exists
            if (filesBackupPath) {
                const filesFileName = path.basename(filesBackupPath);
                command += ` "${filesFileName}"`;
            }
            
            execSync(command);
            
            // Clean up individual backup files
            await fs.unlink(dbBackupPath);
            if (filesBackupPath) {
                await fs.rm(filesBackupPath, { recursive: true, force: true });
            }
            
            console.log('✅ Backup archive created');
            return archivePath;
            
        } catch (error) {
            console.error('❌ Archive creation failed:', error);
            throw new Error(`Archive creation failed: ${error}`);
        }
    }

    private async cleanupOldBackups(): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

        const oldBackups = this.backupHistory.filter(
            backup => backup.timestamp < cutoffDate && backup.status === 'success'
        );

        for (const backup of oldBackups) {
            try {
                await fs.unlink(backup.path);
                console.log(`🗑️ Removed old backup: ${backup.id}`);
            } catch (error) {
                console.error(`Failed to remove old backup: ${backup.id}`, error);
            }
        }

        // Remove old backups from history
        this.backupHistory = this.backupHistory.filter(
            backup => backup.timestamp >= cutoffDate
        );

        await this.saveBackupHistory();
    }

    private async loadBackupHistory(): Promise<void> {
        const historyPath = path.join(this.config.backupPath, 'backup_history.json');
        
        try {
            const data = await fs.readFile(historyPath, 'utf8');
            this.backupHistory = JSON.parse(data);
        } catch (error) {
            console.log('No backup history found, starting fresh');
            this.backupHistory = [];
        }
    }

    private async saveBackupHistory(): Promise<void> {
        const historyPath = path.join(this.config.backupPath, 'backup_history.json');
        
        try {
            await fs.writeFile(
                historyPath, 
                JSON.stringify(this.backupHistory, null, 2)
            );
        } catch (error) {
            console.error('Failed to save backup history:', error);
        }
    }

    async restoreBackup(backupId: string): Promise<void> {
        const backup = this.backupHistory.find(b => b.id === backupId);
        
        if (!backup) {
            throw new Error('Backup not found');
        }

        if (backup.status !== 'success') {
            throw new Error('Cannot restore failed backup');
        }

        console.log(`🔄 Starting restore from backup: ${backupId}`);

        try {
            // Extract backup if compressed
            if (this.config.compression && backup.path.endsWith('.tar.gz')) {
                const extractPath = path.join(this.config.backupPath, `restore_${backupId}`);
                await fs.mkdir(extractPath, { recursive: true });
                
                execSync(`tar -xzf "${backup.path}" -C "${extractPath}"`);
                
                // Find database backup file
                const files = await fs.readdir(extractPath);
                const dbFile = files.find(f => f.includes('database'));
                
                if (dbFile) {
                    await this.restoreDatabase(path.join(extractPath, dbFile));
                }
                
                // Clean up extraction directory
                await fs.rm(extractPath, { recursive: true, force: true });
            } else {
                await this.restoreDatabase(backup.path);
            }

            console.log(`✅ Restore completed from backup: ${backupId}`);
            
        } catch (error) {
            console.error(`❌ Restore failed from backup: ${backupId}`, error);
            throw error;
        }
    }

    private async restoreDatabase(backupPath: string): Promise<void> {
        const dbType = process.env.DB_TYPE || 'sqlite';

        if (dbType === 'postgres' || dbType === 'postgresql') {
            await this.restorePostgreSQL(backupPath);
        } else {
            await this.restoreSQLite(backupPath);
        }
    }

    private async restorePostgreSQL(backupPath: string): Promise<void> {
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';
        const dbName = process.env.DB_DATABASE || 'banking_system';
        const dbUser = process.env.DB_USERNAME || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || '';

        const env = { ...process.env, PGPASSWORD: dbPassword };
        
        // Drop and recreate database
        execSync(`dropdb -h ${dbHost} -p ${dbPort} -U ${dbUser} ${dbName} --if-exists`, { env });
        execSync(`createdb -h ${dbHost} -p ${dbPort} -U ${dbUser} ${dbName}`, { env });
        
        // Restore from backup
        execSync(`psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`, { env });
        
        console.log('✅ PostgreSQL database restored');
    }

    private async restoreSQLite(backupPath: string): Promise<void> {
        const dbPath = path.join(process.cwd(), 'database.sqlite');
        
        // Backup current database
        const currentBackup = `${dbPath}.backup_${Date.now()}`;
        try {
            await fs.copyFile(dbPath, currentBackup);
        } catch (error) {
            console.log('No existing database to backup');
        }
        
        // Restore from backup
        await fs.copyFile(backupPath, dbPath);
        
        console.log('✅ SQLite database restored');
    }

    getBackupHistory(): BackupResult[] {
        return [...this.backupHistory];
    }

    getBackupStats() {
        const totalBackups = this.backupHistory.length;
        const successfulBackups = this.backupHistory.filter(b => b.status === 'success').length;
        const failedBackups = totalBackups - successfulBackups;
        const totalSize = this.backupHistory
            .filter(b => b.status === 'success')
            .reduce((sum, b) => sum + b.size, 0);

        const lastBackup = this.backupHistory[0];
        const nextBackup = this.getNextBackupTime();

        return {
            totalBackups,
            successfulBackups,
            failedBackups,
            totalSize: this.formatSize(totalSize),
            lastBackup: lastBackup ? {
                timestamp: lastBackup.timestamp,
                status: lastBackup.status,
                size: this.formatSize(lastBackup.size),
                duration: `${lastBackup.duration}ms`
            } : null,
            nextBackup,
            isRunning: this.isRunning,
            config: this.config
        };
    }

    private getNextBackupTime(): Date {
        const now = new Date();
        const next = new Date();

        switch (this.config.frequency) {
            case 'daily':
                next.setDate(now.getDate() + 1);
                next.setHours(2, 0, 0, 0);
                break;
            case 'weekly':
                const daysUntilSunday = (7 - now.getDay()) % 7;
                next.setDate(now.getDate() + (daysUntilSunday || 7));
                next.setHours(2, 0, 0, 0);
                break;
            case 'monthly':
                next.setMonth(now.getMonth() + 1, 1);
                next.setHours(2, 0, 0, 0);
                break;
        }

        return next;
    }

    private formatSize(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    updateConfig(newConfig: Partial<BackupConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('📝 Backup configuration updated');
    }
}

export default BackupService;