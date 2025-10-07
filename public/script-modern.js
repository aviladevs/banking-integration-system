// ===== MODERN BANKING SYSTEM JS =====

class BankingApp {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = null;
        this.socket = null;
        this.notifications = [];
        this.charts = {};
        
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupEventListeners();
        
        if (this.token) {
            try {
                await this.validateToken();
                this.showDashboard();
                this.initializeSocket();
                await this.loadDashboardData();
            } catch (error) {
                this.logout();
            }
        } else {
            this.showLogin();
        }
        
        this.hideLoading();
    }

    // ===== THEME MANAGEMENT =====
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Animate theme transition
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    // ===== AUTHENTICATION =====
    async login(email, password) {
        try {
            this.showLoading('Entrando...');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('authToken', this.token);
                
                this.showSuccess('Login realizado com sucesso!');
                this.showDashboard();
                this.initializeSocket();
                await this.loadDashboardData();
            } else {
                this.showError(data.error || 'Erro no login');
            }
        } catch (error) {
            this.showError('Erro de conexão');
        } finally {
            this.hideLoading();
        }
    }

    async register(userData) {
        try {
            this.showLoading('Criando conta...');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Conta criada com sucesso! Faça login.');
                this.showLogin();
            } else {
                this.showError(data.error || 'Erro no registro');
            }
        } catch (error) {
            this.showError('Erro de conexão');
        } finally {
            this.hideLoading();
        }
    }

    async validateToken() {
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        this.user = await response.json();
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.showLogin();
    }

    // ===== REAL-TIME NOTIFICATIONS =====
    initializeSocket() {
        if (!this.token) return;

        this.socket = io({
            auth: {
                token: this.token
            }
        });

        this.socket.on('connect', () => {
            console.log('🔌 Conectado ao servidor');
        });

        this.socket.on('new_notification', (notification) => {
            this.addNotification(notification);
            this.showToast(notification.title, notification.message, notification.type);
        });

        this.socket.on('pending_notifications', (data) => {
            this.notifications = data.notifications;
            this.updateNotificationBadge();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado do servidor');
        });
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        this.updateNotificationBadge();
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // ===== UI MANAGEMENT =====
    showLogin() {
        this.hideAllScreens();
        document.getElementById('loginScreen').classList.remove('hidden');
    }

    showRegister() {
        this.hideAllScreens();
        document.getElementById('registerScreen').classList.remove('hidden');
    }

    showDashboard() {
        this.hideAllScreens();
        document.getElementById('dashboard').classList.remove('hidden');
        
        // Update user info
        if (this.user) {
            document.getElementById('userName').textContent = this.user.name;
            document.getElementById('userEmail').textContent = this.user.email;
        }
    }

    hideAllScreens() {
        const screens = ['loginScreen', 'registerScreen', 'dashboard'];
        screens.forEach(screen => {
            const element = document.getElementById(screen);
            if (element) element.classList.add('hidden');
        });
    }

    showLoading(message = 'Carregando...') {
        const spinner = document.getElementById('loadingSpinner');
        const text = spinner.querySelector('p');
        if (text) text.textContent = message;
        spinner.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }

    // ===== DASHBOARD DATA =====
    async loadDashboardData() {
        try {
            // Load multiple endpoints in parallel
            const [
                dashboardResponse,
                analyticsResponse,
                notificationsResponse
            ] = await Promise.all([
                this.fetchAPI('/api/analytics-advanced/dashboard'),
                this.fetchAPI('/api/analytics-advanced/expenses-by-category'),
                this.fetchAPI('/api/notifications')
            ]);

            this.renderDashboardSummary(dashboardResponse);
            this.renderExpenseChart(analyticsResponse);
            this.notifications = notificationsResponse.notifications || [];
            this.updateNotificationBadge();

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    renderDashboardSummary(data) {
        const summary = data.summary;
        
        // Update stat cards
        this.updateStatCard('totalBalance', this.formatCurrency(summary.totalBalance));
        this.updateStatCard('totalIncome', this.formatCurrency(summary.totalIncome));
        this.updateStatCard('totalExpenses', this.formatCurrency(summary.totalExpenses));
        this.updateStatCard('accountCount', summary.accountCount);
    }

    updateStatCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('fade-in');
        }
    }

    renderExpenseChart(data) {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.expenses) {
            this.charts.expenses.destroy();
        }

        const categories = data.categories || [];
        
        this.charts.expenses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.category),
                datasets: [{
                    data: categories.map(c => c.amount),
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                    ],
                    borderWidth: 0,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = this.formatCurrency(context.parsed);
                                return `${context.label}: ${value}`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // ===== API HELPERS =====
    async fetchAPI(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // ===== UTILITY FUNCTIONS =====
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    // ===== NOTIFICATIONS =====
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${title}</strong>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body">${message}</div>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });
    }

    showSuccess(message) {
        this.showToast('Sucesso', message, 'success');
    }

    showError(message) {
        this.showToast('Erro', message, 'error');
    }

    showWarning(message) {
        this.showToast('Atenção', message, 'warning');
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(loginForm);
                this.login(formData.get('email'), formData.get('password'));
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(registerForm);
                this.register({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    phone: formData.get('phone')
                });
            });
        }

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.dataset.action;
                this.handleAction(action, e.target);
            }
        });

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('mobile-open');
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                    case 'l':
                        e.preventDefault();
                        if (this.token) this.logout();
                        break;
                }
            }
        });
    }

    handleAction(action, element) {
        switch (action) {
            case 'show-login':
                this.showLogin();
                break;
            case 'show-register':
                this.showRegister();
                break;
            case 'logout':
                this.logout();
                break;
            case 'load-accounts':
                this.loadAccountsTab();
                break;
            case 'load-transactions':
                this.loadTransactionsTab();
                break;
            case 'load-analytics':
                this.loadAnalyticsTab();
                break;
            case 'load-notifications':
                this.loadNotificationsTab();
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    // ===== TAB MANAGEMENT =====
    async loadAccountsTab() {
        this.setActiveTab('accounts');
        // Load accounts data
    }

    async loadTransactionsTab() {
        this.setActiveTab('transactions');
        // Load transactions data
    }

    async loadAnalyticsTab() {
        this.setActiveTab('analytics');
        // Load advanced analytics
    }

    async loadNotificationsTab() {
        this.setActiveTab('notifications');
        // Load notifications panel
    }

    setActiveTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-action="load-${tabName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }
    }
}

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', () => {
    window.bankingApp = new BankingApp();
});

// ===== PROGRESSIVE WEB APP SUPPORT =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}