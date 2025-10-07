// Banking Integration System Frontend
class BankingApp {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = null;
        this.currentSection = 'overview';
        this.charts = {};
        this.offlineMode = false;
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();

            if (this.token) {
                await this.loadUserData();
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } finally {
            // Sempre esconde o spinner, mesmo em caso de erro
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Auth forms
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Auth navigation
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // Dashboard navigation
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Action buttons
    const syncBtn = document.getElementById('syncAllBtn');
    if (syncBtn) syncBtn.addEventListener('click', () => this.syncAllBanks());
    const addAccountBtn = document.getElementById('addAccountBtn');
    if (addAccountBtn) addAccountBtn.addEventListener('click', () => this.showAddAccountModal());
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) addTransactionBtn.addEventListener('click', () => this.showAddTransactionModal());
    const connectBankBtn = document.getElementById('connectBankBtn');
    if (connectBankBtn) connectBankBtn.addEventListener('click', () => this.showConnectBankModal());
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) generateReportBtn.addEventListener('click', () => this.generateReport());

        // Modal handling
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') this.hideModal();
        });
        
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        // Forms
    const addAccountForm = document.getElementById('addAccountForm');
    if (addAccountForm) addAccountForm.addEventListener('submit', (e) => this.handleAddAccount(e));
    const addTransactionForm = document.getElementById('addTransactionForm');
    if (addTransactionForm) addTransactionForm.addEventListener('submit', (e) => this.handleAddTransaction(e));

        // Filters
        const filter = document.getElementById('transactionFilter');
        if (filter) filter.addEventListener('change', () => this.loadTransactions());
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        
        const loginOrEmail = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        // Login simplificado solicitado: nicolas / nicolas2024
        const SIMPLE_LOGIN = 'nicolas';
        const SIMPLE_PASSWORD = 'nicolas2024';

        // Caso 1: credenciais simples
        if ((loginOrEmail.toLowerCase() === SIMPLE_LOGIN || loginOrEmail.toLowerCase() === `${SIMPLE_LOGIN}@email.com`) && password === SIMPLE_PASSWORD) {
            // Criamos um token fake e usuário fake
            const fakeToken = 'local-simple-token';
            const fakeUser = { id: 'local-user', name: 'Nicolas', email: 'nicolas@email.com' };

            this.token = fakeToken;
            this.user = fakeUser;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('authUser', JSON.stringify(this.user));

            this.showNotification('Login realizado com sucesso!', 'success');
            this.showDashboard();
            await this.loadDashboardData().catch(() => {/* ignora erros se API exigir token real */});
            return;
        }

        // Caso 2: fluxo normal via API (permanece funcional)
        try {
            const response = await this.apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: loginOrEmail, password })
            });
            
            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('authUser', JSON.stringify(this.user));
            
            this.showNotification('Login realizado com sucesso!', 'success');
            this.showDashboard();
            await this.loadDashboardData();
            
        } catch (error) {
            this.showNotification(error.message || 'Falha no login', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const phone = document.getElementById('registerPhone').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await this.apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, phone, password })
            });
            
            this.token = response.token;
            this.user = response.user;
            localStorage.setItem('authToken', this.token);
            
            this.showNotification('Cadastro realizado com sucesso!', 'success');
            this.showDashboard();
            await this.loadDashboardData();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        this.showLogin();
        this.showNotification('Logout realizado com sucesso!', 'info');
    }

    // UI Methods
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
    }

    showRegister() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'grid';
        
        if (this.user) {
            document.getElementById('userName').textContent = this.user.name;
        }
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navTarget = document.querySelector(`[data-section="${section}"]`);
        if (navTarget) navTarget.classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        const target = document.getElementById(`${section}Section`);
        if (target) target.classList.add('active');

        this.currentSection = section;
        this.loadSectionData(section);
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showModal(modalId) {
        document.getElementById('modalOverlay').classList.add('active');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Data Loading Methods
    async loadUserData() {
        // Primeiro tenta ler do localStorage (login simples)
        const cached = localStorage.getItem('authUser');
        if (cached) {
            try {
                this.user = JSON.parse(cached);
                return;
            } catch {}
        }
        // Senão, tenta API
        try {
            const response = await this.apiRequest('/api/users/me');
            this.user = response;
        } catch (error) {
            console.warn('Falha ao carregar usuário via API. Usando modo offline.');
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadOverview(),
            this.loadAccounts(),
            this.loadTransactions(),
            this.loadBankConnections()
        ]);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'overview':
                await this.loadOverview();
                break;
            case 'accounts':
                await this.loadAccounts();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'banks':
                await this.loadBankConnections();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadOverview() {
        try {
            const [balances, analytics] = await Promise.all([
                this.apiRequest('/api/banks/balances'),
                this.apiRequest('/api/analytics/summary')
            ]);

            // Update stats
            this.safeSetText('totalBalance', this.formatCurrency(balances.totalBalance));
            this.safeSetText('activeAccounts', balances.summary.totalAccounts);
            this.safeSetText('connectedBanks', balances.summary.connectedAccounts);
            this.safeSetText('monthlyTransactions', analytics.transactionCount);

            // Update charts
            this.updateBalanceChart(balances.accounts);
            this.updateIncomeExpenseChart(analytics);

        } catch (error) {
            console.warn('Modo offline: usando valores padrão para overview.');
            this.offlineMode = true;
            // Placeholders
            this.safeSetText('totalBalance', this.formatCurrency(0));
            this.safeSetText('connectedBanks', '0');
            this.safeSetText('monthlyIncome', this.formatCurrency(0));
            this.safeSetText('monthlyExpenses', this.formatCurrency(0));
            // Gráficos vazios
            try { this.updateBalanceChart([]); } catch {}
            try { this.updateIncomeExpenseChart({ totalIncome: 0, totalExpenses: 0 }); } catch {}
        }
    }

    async loadAccounts() {
        try {
            const accounts = await this.apiRequest('/api/accounts');
            this.renderAccountsTable(accounts);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        }
    }

    async loadTransactions() {
        try {
            const filter = document.getElementById('transactionFilter').value;
            const params = new URLSearchParams();
            if (filter) params.append('type', filter);
            
            const response = await this.apiRequest(`/api/transactions?${params}`);
            this.renderTransactionsTable(response.transactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    async loadBankConnections() {
        try {
            const connections = await this.apiRequest('/api/banks/connections');
            this.renderBanksGrid(connections);
        } catch (error) {
            console.error('Failed to load bank connections:', error);
        }
    }

    async loadAnalytics() {
        try {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const analytics = await this.apiRequest(`/api/analytics/summary?${params}`);
            
            document.getElementById('totalIncome').textContent = this.formatCurrency(analytics.totalIncome);
            document.getElementById('totalExpenses').textContent = this.formatCurrency(analytics.totalExpenses);
            document.getElementById('netIncome').textContent = this.formatCurrency(analytics.netIncome);
            
            this.updateCategoryChart(analytics.byCategory);
            
        } catch (error) {
            console.warn('Modo offline: analytics não disponível.');
            this.safeSetText('totalIncome', this.formatCurrency(0));
            this.safeSetText('totalExpenses', this.formatCurrency(0));
            this.safeSetText('netIncome', this.formatCurrency(0));
            try { this.updateCategoryChart({}); } catch {}
        }
    }

    // Rendering Methods
    renderAccountsTable(accounts) {
        const tbody = document.getElementById('accountsTableBody');
        tbody.innerHTML = '';

        accounts.forEach(account => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${account.bankName}</td>
                <td>${this.formatAccountType(account.accountType)}</td>
                <td>${account.accountNumber}</td>
                <td>${account.agency}</td>
                <td>${this.formatCurrency(account.balance)}</td>
                <td><span class="status-badge ${account.isActive ? 'status-active' : 'status-inactive'}">
                    ${account.isActive ? 'Ativa' : 'Inativa'}
                </span></td>
                <td>
                    <button class="btn btn-outline" onclick="app.editAccount('${account.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline" onclick="app.deleteAccount('${account.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderTransactionsTable(transactions) {
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(transaction.transactionDate)}</td>
                <td>${transaction.description}</td>
                <td>${transaction.bankAccount?.bankName || 'N/A'}</td>
                <td>${this.formatTransactionType(transaction.type)}</td>
                <td>${transaction.category || '-'}</td>
                <td class="${transaction.type === 'credit' ? 'text-success' : 'text-danger'}">
                    ${this.formatCurrency(transaction.amount)}
                </td>
                <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    renderBanksGrid(connections) {
        const grid = document.getElementById('banksGrid');
        grid.innerHTML = '';

        const banks = [
            { id: 'bb', name: 'Banco do Brasil', icon: 'university' },
            { id: 'bradesco', name: 'Bradesco', icon: 'university' },
            { id: 'itau', name: 'Itaú', icon: 'university' },
            { id: 'santander', name: 'Santander', icon: 'university' },
            { id: 'caixa', name: 'Caixa', icon: 'university' },
            { id: 'nubank', name: 'Nubank', icon: 'university' },
            { id: 'inter', name: 'Inter', icon: 'university' },
            { id: 'sicoob', name: 'Sicoob', icon: 'university' }
        ];

        banks.forEach(bank => {
            const connection = connections.find(conn => conn.bankType === bank.id);
            const card = document.createElement('div');
            card.className = 'bank-card';
            card.innerHTML = `
                <div class="bank-logo">
                    <i class="fas fa-${bank.icon}"></i>
                </div>
                <h4>${bank.name}</h4>
                <p class="status-badge ${connection ? 'status-connected' : 'status-inactive'}">
                    ${connection ? 'Conectado' : 'Não Conectado'}
                </p>
                <button class="btn btn-primary" onclick="app.${connection ? 'disconnect' : 'connect'}Bank('${bank.id}')">
                    ${connection ? 'Desconectar' : 'Conectar'}
                </button>
            `;
            grid.appendChild(card);
        });
    }

    // Chart Methods
    updateBalanceChart(accounts) {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        
        if (this.charts.balance) {
            this.charts.balance.destroy();
        }

        const data = accounts.map(account => ({
            label: account.bankName,
            value: parseFloat(account.balance)
        }));

        this.charts.balance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateIncomeExpenseChart(analytics) {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
        
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas'],
                datasets: [{
                    data: [analytics.totalIncome, analytics.totalExpenses],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }

    updateCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        this.charts.category = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Modal Methods
    showAddAccountModal() {
        this.showModal('addAccountModal');
    }

    showAddTransactionModal() {
        this.showModal('addTransactionModal');
        this.loadAccountsSelect();
    }

    async loadAccountsSelect() {
        try {
            const accounts = await this.apiRequest('/api/accounts');
            const select = document.getElementById('transactionAccount');
            select.innerHTML = '<option value="">Selecione a conta</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.bankName} - ${account.accountNumber}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load accounts for select:', error);
        }
    }

    // Form Handlers
    async handleAddAccount(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            bankType: document.getElementById('accountBank').value,
            bankName: document.getElementById('accountBank').options[document.getElementById('accountBank').selectedIndex].text,
            accountType: document.getElementById('accountType').value,
            agency: document.getElementById('accountAgency').value,
            accountNumber: document.getElementById('accountNumber').value
        };
        
        try {
            await this.apiRequest('/api/accounts', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            this.showNotification('Conta adicionada com sucesso!', 'success');
            this.hideModal();
            this.loadAccounts();
            e.target.reset();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleAddTransaction(e) {
        e.preventDefault();
        
        const data = {
            bankAccountId: document.getElementById('transactionAccount').value,
            description: document.getElementById('transactionDescription').value,
            type: document.getElementById('transactionType').value,
            amount: document.getElementById('transactionAmount').value,
            category: document.getElementById('transactionCategory').value,
            transactionDate: document.getElementById('transactionDate').value
        };
        
        try {
            await this.apiRequest('/api/transactions', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            this.showNotification('Transação adicionada com sucesso!', 'success');
            this.hideModal();
            this.loadTransactions();
            this.loadOverview();
            e.target.reset();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Bank Methods
    async connectBank(bankId) {
        const bankNames = {
            bb: 'Banco do Brasil',
            bradesco: 'Bradesco',
            itau: 'Itaú',
            santander: 'Santander',
            caixa: 'Caixa',
            nubank: 'Nubank',
            inter: 'Inter',
            sicoob: 'Sicoob'
        };

        try {
            await this.apiRequest('/api/banks/connect', {
                method: 'POST',
                body: JSON.stringify({
                    bankType: bankId,
                    bankName: bankNames[bankId]
                })
            });
            
            this.showNotification(`Conectado ao ${bankNames[bankId]} com sucesso!`, 'success');
            this.loadBankConnections();
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async syncAllBanks() {
        try {
            const response = await this.apiRequest('/api/banks/sync', { method: 'POST' });
            this.showNotification('Sincronização concluída!', 'success');
            this.loadDashboardData();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async generateReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            this.showNotification('Selecione o período para gerar o relatório', 'warning');
            return;
        }
        
        this.loadAnalytics();
        this.showNotification('Relatório gerado com sucesso!', 'success');
    }

    // Utility Methods
    async apiRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            return data;
        } catch (err) {
            // Marca modo offline e propaga erro para os callers tratarem com placeholders
            this.offlineMode = true;
            throw err;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    formatAccountType(type) {
        const types = {
            checking: 'Conta Corrente',
            savings: 'Poupança',
            credit: 'Cartão de Crédito',
            investment: 'Investimentos'
        };
        return types[type] || type;
    }

    formatTransactionType(type) {
        const types = {
            credit: 'Receita',
            debit: 'Despesa',
            transfer: 'Transferência',
            pix: 'PIX',
            ted: 'TED',
            doc: 'DOC'
        };
        return types[type] || type;
    }
}

// Initialize the app
const app = new BankingApp();

// Helpers
BankingApp.prototype.safeSetText = function(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
};