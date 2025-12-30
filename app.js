// Expense Tracker Application
class ExpenseTracker {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        this.bills = JSON.parse(localStorage.getItem('bills')) || [];
        this.dailyBudget = parseFloat(localStorage.getItem('dailyBudget')) || 0;
        this.currentChartType = 'category';
        this.chart = null;

        this.init();
    }

    // Toast Notification System
    showToast(message, type = 'success', duration = 3000) {
        // Get or create toast container
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`,
            error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`,
            warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    removeToast(toast) {
        if (toast && toast.parentElement) {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }

    init() {
        this.setupNavigation();
        this.setupCardClicks();
        this.setupExpenseForm();
        this.setupIncomeForm();
        this.setupBillForm();
        this.setupFilters();
        this.setupDailyBudget();
        this.setupThemeToggle();
        this.setupChartTabs();
        this.setupSearchAndDateFilters();
        this.setCurrentDate();
        this.renderAll();
    }

    // Theme Toggle
    setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';

        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Re-render chart with new theme colors
            this.renderChart();
        });
    }

    // Chart Tabs
    setupChartTabs() {
        const tabs = document.querySelectorAll('.chart-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentChartType = tab.dataset.chart;
                this.renderChart();
            });
        });
    }

    // Search and Date Filters
    setupSearchAndDateFilters() {
        const searchInput = document.getElementById('searchExpense');
        const dateFrom = document.getElementById('filterDateFrom');
        const dateTo = document.getElementById('filterDateTo');
        const clearDates = document.getElementById('clearDates');

        searchInput.addEventListener('input', () => this.renderExpenseList());
        dateFrom.addEventListener('change', () => this.renderExpenseList());
        dateTo.addEventListener('change', () => this.renderExpenseList());

        clearDates.addEventListener('click', () => {
            dateFrom.value = '';
            dateTo.value = '';
            this.renderExpenseList();
        });
    }

    // Navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const sectionId = item.dataset.section;

                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show corresponding section
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === sectionId) {
                        section.classList.add('active');
                    }
                });
            });
        });

        // Show dashboard by default
        document.getElementById('dashboard').classList.add('active');
    }

    // Navigate to a specific section
    navigateToSection(sectionId, filterValue = null) {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');

        // Update active nav item
        navItems.forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.section === sectionId) {
                nav.classList.add('active');
            }
        });

        // Show corresponding section
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });

        // Apply filter if provided
        if (filterValue !== null) {
            if (sectionId === 'bills') {
                document.getElementById('filterBillStatus').value = filterValue;
                this.renderBillList();
            } else if (sectionId === 'expenses') {
                document.getElementById('filterCategory').value = filterValue;
                this.renderExpenseList();
            } else if (sectionId === 'income') {
                document.getElementById('filterIncomeSource').value = filterValue;
                this.renderIncomeList();
            }
        }
    }

    // Setup clickable dashboard cards
    setupCardClicks() {
        // Income card click
        document.getElementById('incomeCard').addEventListener('click', () => {
            this.navigateToSection('income', 'all');
        });

        // Expense card click
        document.getElementById('expenseCard').addEventListener('click', () => {
            this.navigateToSection('expenses', 'all');
        });

        // Pending Bills card click
        document.getElementById('billsCard').addEventListener('click', () => {
            this.navigateToSection('bills', 'pending');
        });

        // Bills summary items clicks
        document.getElementById('pendingBillsSummary').addEventListener('click', () => {
            this.navigateToSection('bills', 'pending');
        });

        document.getElementById('paidBillsSummary').addEventListener('click', () => {
            this.navigateToSection('bills', 'paid');
        });

        document.getElementById('overdueBillsSummary').addEventListener('click', () => {
            this.navigateToSection('bills', 'overdue');
        });
    }

    // Set current date in header
    setCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('en-US', options);

        // Set default date in forms
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        document.getElementById('incomeDate').value = today;
        document.getElementById('billDueDate').value = today;
    }

    // Expense Form
    setupExpenseForm() {
        const form = document.getElementById('expenseForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn.disabled) return;
            btn.disabled = true;
            this.addExpense();
            setTimeout(() => btn.disabled = false, 500);
        });
    }

    addExpense() {
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = document.getElementById('expenseDate').value;
        const type = document.querySelector('input[name="expenseType"]:checked').value;

        if (!description || !amount || !category || !date) return;

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date,
            type,
            createdAt: new Date().toISOString()
        };

        this.expenses.unshift(expense);
        this.saveExpenses();
        this.renderAll();
        this.resetExpenseForm();
        this.showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(exp => exp.id !== id);
        this.saveExpenses();
        this.renderAll();
        this.showToast('Transaction deleted', 'error');
    }

    resetExpenseForm() {
        console.log('Resetting expense form...');
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseCategory').selectedIndex = 0;
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        document.querySelector('input[name="expenseType"][value="expense"]').checked = true;
    }

    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    // Income Form
    setupIncomeForm() {
        const form = document.getElementById('incomeForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn.disabled) return;
            btn.disabled = true;
            this.addIncome();
            setTimeout(() => btn.disabled = false, 500);
        });
    }

    addIncome() {
        const description = document.getElementById('incomeDescription').value.trim();
        const amount = parseFloat(document.getElementById('incomeAmount').value);
        const source = document.getElementById('incomeSource').value;
        const date = document.getElementById('incomeDate').value;

        if (!description || !amount || !source || !date) return;

        const income = {
            id: Date.now(),
            description,
            amount,
            category: source,
            date,
            type: 'income',
            source,
            createdAt: new Date().toISOString()
        };

        this.expenses.unshift(income);
        this.saveExpenses();
        this.renderAll();
        this.resetIncomeForm();
        this.showToast('Income added successfully!', 'success');
    }

    deleteIncome(id) {
        this.expenses = this.expenses.filter(exp => exp.id !== id);
        this.saveExpenses();
        this.renderAll();
        this.showToast('Income deleted', 'error');
    }

    resetIncomeForm() {
        console.log('Resetting income form...');
        document.getElementById('incomeDescription').value = '';
        document.getElementById('incomeAmount').value = '';
        document.getElementById('incomeSource').selectedIndex = 0;
        document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
    }

    // Bill Form
    setupBillForm() {
        const form = document.getElementById('billForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn.disabled) return;
            btn.disabled = true;
            this.addBill();
            setTimeout(() => btn.disabled = false, 500);
        });
    }

    addBill() {
        const name = document.getElementById('billName').value.trim();
        const amount = parseFloat(document.getElementById('billAmount').value);
        const dueDate = document.getElementById('billDueDate').value;
        const recurring = document.getElementById('billRecurring').value;

        if (!name || !amount || !dueDate) return;

        const bill = {
            id: Date.now(),
            name,
            amount,
            dueDate,
            recurring,
            paid: false,
            createdAt: new Date().toISOString()
        };

        this.bills.push(bill);
        this.saveBills();
        this.renderAll();
        this.resetBillForm();
        this.showToast('Bill added successfully!', 'success');
    }

    deleteBill(id) {
        this.bills = this.bills.filter(bill => bill.id !== id);
        this.saveBills();
        this.renderAll();
        this.showToast('Bill deleted', 'error');
    }

    markBillPaid(id) {
        const bill = this.bills.find(b => b.id === id);
        if (bill) {
            const wasPaid = bill.paid;
            bill.paid = !bill.paid;
            bill.paidDate = bill.paid ? new Date().toISOString() : null;

            if (bill.paid && !wasPaid) {
                // Bill is now being marked as paid - create an expense entry
                this.createExpenseFromBill(bill);

                // If bill is recurring, create next bill
                if (bill.recurring !== 'none') {
                    this.createNextRecurringBill(bill);
                }
            } else if (!bill.paid && wasPaid) {
                // Bill is being unmarked as paid - remove the associated expense
                this.removeExpenseFromBill(bill);
            }

            this.saveBills();
            this.renderAll();

            if (bill.paid) {
                this.showToast('Bill marked as paid', 'success');
            } else {
                this.showToast('Bill marked as unpaid', 'warning');
            }
        }
    }

    // Create an expense entry when a bill is paid
    createExpenseFromBill(bill) {
        const expense = {
            id: Date.now(),
            description: `Bill Payment: ${bill.name}`,
            amount: bill.amount,
            category: 'utilities',
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            createdAt: new Date().toISOString(),
            billId: bill.id // Link to the original bill
        };

        this.expenses.unshift(expense);
        this.saveExpenses();
    }

    // Remove expense when bill is unmarked as paid
    removeExpenseFromBill(bill) {
        this.expenses = this.expenses.filter(exp => exp.billId !== bill.id);
        this.saveExpenses();
    }

    createNextRecurringBill(bill) {
        const dueDate = new Date(bill.dueDate);

        switch(bill.recurring) {
            case 'weekly':
                dueDate.setDate(dueDate.getDate() + 7);
                break;
            case 'monthly':
                dueDate.setMonth(dueDate.getMonth() + 1);
                break;
            case 'yearly':
                dueDate.setFullYear(dueDate.getFullYear() + 1);
                break;
        }

        const newBill = {
            id: Date.now(),
            name: bill.name,
            amount: bill.amount,
            dueDate: dueDate.toISOString().split('T')[0],
            recurring: bill.recurring,
            paid: false,
            createdAt: new Date().toISOString()
        };

        this.bills.push(newBill);
    }

    resetBillForm() {
        console.log('Resetting bill form...');
        document.getElementById('billName').value = '';
        document.getElementById('billAmount').value = '';
        document.getElementById('billDueDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('billRecurring').selectedIndex = 0;
    }

    saveBills() {
        localStorage.setItem('bills', JSON.stringify(this.bills));
    }

    // Filters
    setupFilters() {
        const filterCategory = document.getElementById('filterCategory');
        filterCategory.addEventListener('change', () => this.renderExpenseList());

        const filterIncomeSource = document.getElementById('filterIncomeSource');
        filterIncomeSource.addEventListener('change', () => this.renderIncomeList());

        const filterBillStatus = document.getElementById('filterBillStatus');
        filterBillStatus.addEventListener('change', () => this.renderBillList());
    }

    // Daily Budget
    setupDailyBudget() {
        const editBtn = document.getElementById('editBudgetBtn');
        const saveBtn = document.getElementById('saveBudgetBtn');
        const cancelBtn = document.getElementById('cancelBudgetBtn');
        const budgetForm = document.getElementById('dailyBudgetForm');
        const budgetInput = document.getElementById('dailyBudgetInput');

        editBtn.addEventListener('click', () => {
            budgetForm.style.display = 'flex';
            budgetInput.value = this.dailyBudget || '';
            budgetInput.focus();
        });

        saveBtn.addEventListener('click', () => {
            const newBudget = parseFloat(budgetInput.value) || 0;
            this.dailyBudget = newBudget;
            localStorage.setItem('dailyBudget', newBudget.toString());
            budgetForm.style.display = 'none';
            this.renderDailyBudget();
            this.showToast('Daily budget updated!', 'success');
        });

        cancelBtn.addEventListener('click', () => {
            budgetForm.style.display = 'none';
        });

        budgetInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    }

    // Get today's date string in YYYY-MM-DD format
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    // Get today's expenses only
    getTodaysExpenses() {
        const today = this.getTodayString();
        return this.expenses.filter(exp => exp.date === today && exp.type === 'expense');
    }

    // Calculate today's total spending
    getTodaysSpending() {
        return this.getTodaysExpenses().reduce((sum, exp) => sum + exp.amount, 0);
    }

    // Render daily budget section
    renderDailyBudget() {
        const spent = this.getTodaysSpending();
        const remaining = this.dailyBudget - spent;
        const percentage = this.dailyBudget > 0 ? (spent / this.dailyBudget) * 100 : 0;

        // Update display values
        document.getElementById('dailySpent').textContent = this.formatCurrency(spent);
        document.getElementById('dailyBudgetAmount').textContent = this.formatCurrency(this.dailyBudget);

        const remainingElement = document.getElementById('dailyRemaining');
        remainingElement.textContent = this.formatCurrency(Math.abs(remaining));
        if (remaining < 0) {
            remainingElement.classList.add('negative');
            remainingElement.textContent = '-' + this.formatCurrency(Math.abs(remaining));
        } else {
            remainingElement.classList.remove('negative');
        }

        // Update progress bar
        const progressBar = document.getElementById('budgetProgressBar');
        const cappedPercentage = Math.min(percentage, 100);
        progressBar.style.width = cappedPercentage + '%';

        // Update progress bar color based on percentage
        progressBar.classList.remove('warning', 'danger');
        if (percentage >= 100) {
            progressBar.classList.add('danger');
        } else if (percentage >= 75) {
            progressBar.classList.add('warning');
        }
    }

    // Render today's expenses list
    renderTodaysExpenses() {
        const container = document.getElementById('todaysExpenses');
        const todaysExpenses = this.getTodaysExpenses();

        if (todaysExpenses.length === 0) {
            container.innerHTML = '<li class="empty-state">No expenses today</li>';
            return;
        }

        container.innerHTML = todaysExpenses.map(exp => `
            <li class="transaction-item">
                <div class="item-info">
                    <div class="item-description">
                        ${this.escapeHtml(exp.description)}
                        <span class="category-tag">${this.getCategoryLabel(exp.category)}</span>
                    </div>
                    <div class="item-meta">${this.formatTime(exp.createdAt)}</div>
                </div>
                <span class="item-amount expense">
                    -${this.formatCurrency(exp.amount)}
                </span>
            </li>
        `).join('');
    }

    // Format time from ISO string
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    // Render Methods
    renderAll() {
        this.renderDashboard();
        this.renderDailyBudget();
        this.renderTodaysExpenses();
        this.renderExpenseList();
        this.renderIncomeList();
        this.renderBillList();
        this.renderChart();
    }

    renderDashboard() {
        // Calculate totals
        const income = this.expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const expenses = this.expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const balance = income - expenses;

        const pendingBillsAmount = this.bills
            .filter(bill => !bill.paid)
            .reduce((sum, bill) => sum + bill.amount, 0);

        // Update dashboard cards
        document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
        document.getElementById('pendingBills').textContent = this.formatCurrency(pendingBillsAmount);

        // Render bills summary counts
        this.renderBillsSummary();

        // Render recent transactions
        this.renderRecentTransactions();
    }

    renderBillsSummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let pendingCount = 0;
        let paidCount = 0;
        let overdueCount = 0;

        this.bills.forEach(bill => {
            if (bill.paid) {
                paidCount++;
            } else {
                const dueDate = new Date(bill.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate < today) {
                    overdueCount++;
                } else {
                    pendingCount++;
                }
            }
        });

        document.getElementById('pendingBillsCount').textContent = pendingCount;
        document.getElementById('paidBillsCount').textContent = paidCount;
        document.getElementById('overdueBillsCount').textContent = overdueCount;
    }

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        const recentExpenses = this.expenses.slice(0, 5);

        if (recentExpenses.length === 0) {
            container.innerHTML = '<li class="empty-state">No transactions yet</li>';
            return;
        }

        container.innerHTML = recentExpenses.map(exp => `
            <li class="transaction-item">
                <div class="item-info">
                    <div class="item-description">
                        ${this.escapeHtml(exp.description)}
                        <span class="category-tag">${this.getCategoryLabel(exp.category)}</span>
                    </div>
                    <div class="item-meta">${this.formatDate(exp.date)}</div>
                </div>
                <span class="item-amount ${exp.type}">
                    ${exp.type === 'income' ? '+' : '-'}${this.formatCurrency(exp.amount)}
                </span>
            </li>
        `).join('');
    }

    renderExpenseList() {
        const container = document.getElementById('expenseList');
        const filterValue = document.getElementById('filterCategory').value;
        const searchTerm = document.getElementById('searchExpense').value.toLowerCase().trim();
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;

        let filteredExpenses = this.expenses;

        // Category filter
        if (filterValue !== 'all') {
            filteredExpenses = filteredExpenses.filter(exp => exp.category === filterValue);
        }

        // Search filter
        if (searchTerm) {
            filteredExpenses = filteredExpenses.filter(exp =>
                exp.description.toLowerCase().includes(searchTerm) ||
                this.getCategoryLabel(exp.category).toLowerCase().includes(searchTerm)
            );
        }

        // Date range filter
        if (dateFrom) {
            filteredExpenses = filteredExpenses.filter(exp => exp.date >= dateFrom);
        }
        if (dateTo) {
            filteredExpenses = filteredExpenses.filter(exp => exp.date <= dateTo);
        }

        if (filteredExpenses.length === 0) {
            container.innerHTML = '<li class="empty-state">No matching transactions found</li>';
            return;
        }

        container.innerHTML = filteredExpenses.map(exp => `
            <li class="expense-item">
                <div class="item-info">
                    <div class="item-description">
                        ${this.escapeHtml(exp.description)}
                        <span class="category-tag">${this.getCategoryLabel(exp.category)}</span>
                    </div>
                    <div class="item-meta">${this.formatDate(exp.date)}</div>
                </div>
                <span class="item-amount ${exp.type}">
                    ${exp.type === 'income' ? '+' : '-'}${this.formatCurrency(exp.amount)}
                </span>
                <div class="item-actions">
                    <button class="btn-icon delete" onclick="app.deleteExpense(${exp.id})" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    }

    renderIncomeList() {
        const container = document.getElementById('incomeList');
        const filterValue = document.getElementById('filterIncomeSource').value;

        // Filter only income entries
        let incomeEntries = this.expenses.filter(exp => exp.type === 'income');

        if (filterValue !== 'all') {
            incomeEntries = incomeEntries.filter(inc => inc.source === filterValue);
        }

        if (incomeEntries.length === 0) {
            const emptyMessage = filterValue === 'all' ? 'No income recorded' : `No ${this.getSourceLabel(filterValue)} income`;
            container.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
            return;
        }

        container.innerHTML = incomeEntries.map(inc => `
            <li class="income-item">
                <div class="item-info">
                    <div class="item-description">
                        ${this.escapeHtml(inc.description)}
                        <span class="source-tag">${this.getSourceLabel(inc.source)}</span>
                    </div>
                    <div class="item-meta">${this.formatDate(inc.date)}</div>
                </div>
                <span class="item-amount income">
                    +${this.formatCurrency(inc.amount)}
                </span>
                <div class="item-actions">
                    <button class="btn-icon delete" onclick="app.deleteIncome(${inc.id})" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
    }

    renderBillList() {
        const container = document.getElementById('billList');
        const filterValue = document.getElementById('filterBillStatus').value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter bills based on status
        let filteredBills = this.bills;
        if (filterValue !== 'all') {
            filteredBills = this.bills.filter(bill => {
                const status = this.getBillStatus(bill);
                return status.class === filterValue;
            });
        }

        // Sort bills: unpaid first, then by due date
        const sortedBills = [...filteredBills].sort((a, b) => {
            if (a.paid !== b.paid) return a.paid ? 1 : -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        if (sortedBills.length === 0) {
            const emptyMessage = filterValue === 'all' ? 'No bills added' : `No ${filterValue} bills`;
            container.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
            return;
        }

        container.innerHTML = sortedBills.map(bill => {
            const status = this.getBillStatus(bill);
            const recurringLabel = bill.recurring !== 'none' ? this.getRecurringLabel(bill.recurring) : '';
            const paidDateLabel = bill.paidDate ? `<span class="bill-paid-date">Paid: ${this.formatDate(bill.paidDate.split('T')[0])}</span>` : '';

            return `
                <li class="bill-item">
                    <div class="item-info">
                        <div class="item-description">${this.escapeHtml(bill.name)}</div>
                        <div class="item-meta">
                            Due: ${this.formatDate(bill.dueDate)}
                            ${recurringLabel ? `<span class="bill-recurring"> • ${recurringLabel}</span>` : ''}
                            ${paidDateLabel}
                        </div>
                    </div>
                    <span class="bill-status ${status.class}">${status.label}</span>
                    <span class="item-amount expense">${this.formatCurrency(bill.amount)}</span>
                    <div class="item-actions">
                        <button class="btn-icon paid" onclick="app.markBillPaid(${bill.id})" title="${bill.paid ? 'Mark Unpaid' : 'Mark Paid'}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="app.deleteBill(${bill.id})" title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatDate(dateString) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    getCategoryLabel(category) {
        const labels = {
            food: 'Food & Dining',
            transport: 'Transportation',
            shopping: 'Shopping',
            entertainment: 'Entertainment',
            healthcare: 'Healthcare',
            utilities: 'Utilities',
            income: 'Income',
            other: 'Other'
        };
        return labels[category] || category;
    }

    getSourceLabel(source) {
        const labels = {
            salary: 'Salary',
            freelance: 'Freelance',
            investment: 'Investment',
            rental: 'Rental Income',
            business: 'Business',
            gift: 'Gift',
            refund: 'Refund',
            other: 'Other'
        };
        return labels[source] || source;
    }

    getRecurringLabel(recurring) {
        const labels = {
            weekly: 'Weekly',
            monthly: 'Monthly',
            yearly: 'Yearly'
        };
        return labels[recurring] || '';
    }

    getBillStatus(bill) {
        if (bill.paid) {
            return { label: 'Paid', class: 'paid' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < today) {
            return { label: 'Overdue', class: 'overdue' };
        }

        return { label: 'Pending', class: 'pending' };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Chart Methods
    renderChart() {
        const canvas = document.getElementById('expenseChart');
        const legendContainer = document.getElementById('chartLegend');
        const chartWrapper = canvas.parentElement;

        // Get only expenses (not income)
        const expensesOnly = this.expenses.filter(exp => exp.type === 'expense');

        if (expensesOnly.length === 0) {
            chartWrapper.innerHTML = '<div class="chart-empty">No expense data to display</div>';
            legendContainer.innerHTML = '';
            return;
        }

        // Ensure canvas exists
        if (!chartWrapper.querySelector('canvas')) {
            chartWrapper.innerHTML = '<canvas id="expenseChart"></canvas>';
        }

        const ctx = document.getElementById('expenseChart').getContext('2d');

        if (this.currentChartType === 'category') {
            this.renderCategoryChart(ctx, expensesOnly, legendContainer);
        } else {
            this.renderMonthlyChart(ctx, expensesOnly, legendContainer);
        }
    }

    renderCategoryChart(ctx, expenses, legendContainer) {
        // Group expenses by category
        const categoryData = {};
        const categoryColors = {
            food: '#ef4444',
            transport: '#3b82f6',
            shopping: '#8b5cf6',
            entertainment: '#ec4899',
            healthcare: '#10b981',
            utilities: '#f59e0b',
            other: '#6b7280'
        };

        expenses.forEach(exp => {
            if (!categoryData[exp.category]) {
                categoryData[exp.category] = 0;
            }
            categoryData[exp.category] += exp.amount;
        });

        const categories = Object.keys(categoryData);
        const amounts = Object.values(categoryData);
        const colors = categories.map(cat => categoryColors[cat] || '#6b7280');
        const total = amounts.reduce((a, b) => a + b, 0);

        // Clear previous chart
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw donut chart
        this.drawDonutChart(ctx, amounts, colors, total);

        // Update legend
        legendContainer.innerHTML = categories.map((cat, i) => `
            <div class="legend-item">
                <span class="legend-color" style="background: ${colors[i]}"></span>
                <span>${this.getCategoryLabel(cat)}: ${this.formatCurrency(categoryData[cat])} (${((categoryData[cat] / total) * 100).toFixed(1)}%)</span>
            </div>
        `).join('');
    }

    renderMonthlyChart(ctx, expenses, legendContainer) {
        // Group expenses by month (last 6 months)
        const monthlyData = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = 0;
        }

        expenses.forEach(exp => {
            const month = exp.date.substring(0, 7);
            if (monthlyData.hasOwnProperty(month)) {
                monthlyData[month] += exp.amount;
            }
        });

        const months = Object.keys(monthlyData);
        const amounts = Object.values(monthlyData);
        const maxAmount = Math.max(...amounts, 1);

        // Clear previous chart
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw bar chart
        this.drawBarChart(ctx, months, amounts, maxAmount);

        // Update legend with total
        const total = amounts.reduce((a, b) => a + b, 0);
        legendContainer.innerHTML = `
            <div class="legend-item">
                <span>Total (6 months): ${this.formatCurrency(total)}</span>
            </div>
            <div class="legend-item">
                <span>Average: ${this.formatCurrency(total / 6)}/month</span>
            </div>
        `;
    }

    drawDonutChart(ctx, data, colors, total) {
        const canvas = ctx.canvas;

        // Set canvas size for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const innerRadius = radius * 0.6;

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        let startAngle = -Math.PI / 2;

        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();

            startAngle += sliceAngle;
        });

        // Draw inner circle to create donut effect
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--card-background').trim();
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw center text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        ctx.font = 'bold 14px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.formatCurrency(total), centerX, centerY - 6);
        ctx.font = '11px Poppins, sans-serif';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        ctx.fillText('Total', centerX, centerY + 10);
    }

    drawBarChart(ctx, labels, data, maxValue) {
        const canvas = ctx.canvas;

        // Set canvas size for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const padding = { top: 20, right: 15, bottom: 35, left: 45 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = (chartWidth / labels.length) * 0.6;
        const gap = (chartWidth / labels.length) * 0.4;

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();

        // Draw grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = textColor;
            ctx.font = '9px Poppins, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const value = maxValue - (maxValue / 4) * i;
            ctx.fillText('₹' + Math.round(value), padding.left - 5, y);
        }

        // Draw bars
        labels.forEach((label, index) => {
            const x = padding.left + (index * (barWidth + gap)) + gap / 2;
            const barHeight = (data[index] / maxValue) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            // Draw bar with gradient
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(1, primaryColor + '60');
            ctx.fillStyle = gradient;

            // Draw rounded bar
            const cornerRadius = Math.min(barWidth / 2, 4);
            if (barHeight > cornerRadius) {
                ctx.beginPath();
                ctx.moveTo(x, padding.top + chartHeight);
                ctx.lineTo(x, y + cornerRadius);
                ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
                ctx.lineTo(x + barWidth - cornerRadius, y);
                ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + cornerRadius);
                ctx.lineTo(x + barWidth, padding.top + chartHeight);
                ctx.closePath();
                ctx.fill();
            } else if (barHeight > 0) {
                ctx.fillRect(x, y, barWidth, barHeight);
            }

            // X-axis labels
            ctx.fillStyle = textColor;
            ctx.font = '9px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const monthLabel = new Date(label + '-01').toLocaleDateString('en-US', { month: 'short' });
            ctx.fillText(monthLabel, x + barWidth / 2, padding.top + chartHeight + 8);
        });
    }
}

// Initialize the app
const app = new ExpenseTracker();
