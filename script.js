class WagerLeaderboard {
    constructor() {
        this.apiKey = null;
        this.apiUrl = 'https://api.luxdrop.com/external/affiliates';
        this.affiliateCode = 'Colby';
        this.dateRange = {
            start: '2025-10-01',
            end: '2025-10-31'
        };
        
        this.affiliateData = [];
        this.sortField = 'total_wagered';
        this.sortOrder = 'desc';
        
        this.initializeEventListeners();
        this.loadEnvironmentAndStart();
    }

    async loadEnvironmentAndStart() {
        try {
            // Try to load API key from .env file
            const response = await fetch('.env');
            
            if (!response.ok) {
                throw new Error('Could not load .env file');
            }
            
            const envText = await response.text();
            
            // Parse .env file
            const envLines = envText.split('\n');
            for (const line of envLines) {
                if (line.startsWith('LUXDROP_API_KEY=')) {
                    this.apiKey = line.split('=')[1].trim();
                    break;
                }
            }
            
            if (!this.apiKey) {
                throw new Error('API key not found in .env file');
            }
            
            console.log('✅ API key loaded from .env file');
            
        } catch (error) {
            console.warn('⚠️ Could not load .env file, using fallback API key');
            // Fallback to hardcoded API key
            this.apiKey = 'c1d4f9dc2df3bf5ba5c72cd6aaa96afe9a5ddc4a8f43ef495d78b2875c980bf2';
        }
        
        // Start loading data
        this.loadAffiliateData();
    }

    initializeEventListeners() {
        // Sort controls
        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortField = e.target.value;
            this.sortAndDisplayData();
        });

        document.getElementById('sort-order').addEventListener('click', () => {
            this.toggleSortOrder();
        });
    }

    async loadAffiliateData() {
        // Use configuration values
        const codes = [this.affiliateCode];
        const startDate = this.dateRange.start;
        const endDate = this.dateRange.end;

        this.showLoading(true);
        this.hideError();

        try {
            const data = await this.fetchAffiliateData(codes, startDate, endDate);
            this.processAffiliateData(data);
            this.sortAndDisplayData();
        } catch (error) {
            console.error('Error loading affiliate data:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                this.showError('CORS Error: The API needs to whitelist your domain. Please contact the API administrator to add your domain to the whitelist, or host this page on a web server.');
            } else {
                this.showError('Failed to load Colby\'s affiliate data. Please try again.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async fetchAffiliateData(codes, startDate, endDate) {
        const params = new URLSearchParams({
            codes: codes.join(',')
        });

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`${this.apiUrl}?${params}`, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    processAffiliateData(data) {
        // Process the API response and normalize the data
        this.affiliateData = [];
        
        if (Array.isArray(data)) {
            this.affiliateData = data.map(affiliate => this.normalizeAffiliateData(affiliate));
        } else if (data && typeof data === 'object') {
            // Handle different response formats
            if (data.affiliates) {
                this.affiliateData = data.affiliates.map(affiliate => this.normalizeAffiliateData(affiliate));
            } else if (data.data) {
                this.affiliateData = data.data.map(affiliate => this.normalizeAffiliateData(affiliate));
            } else {
                // Single affiliate object
                this.affiliateData = [this.normalizeAffiliateData(data)];
            }
        }
    }

    normalizeAffiliateData(affiliate) {
        return {
            code: affiliate.code || affiliate.affiliate_code || 'Unknown',
            total_wagered: this.parseNumber(affiliate.total_wagered || affiliate.totalWagered || 0),
            total_earnings: this.parseNumber(affiliate.total_earnings || affiliate.totalEarnings || 0),
            users_registered: this.parseNumber(affiliate.users_registered || affiliate.usersRegistered || 0),
            conversion_rate: this.parseNumber(affiliate.conversion_rate || affiliate.conversionRate || 0),
            last_active: affiliate.last_active || affiliate.lastActive || null,
            created_at: affiliate.created_at || affiliate.createdAt || null,
            ...affiliate // Include any additional fields
        };
    }

    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[$,]/g, '');
            return parseFloat(cleaned) || 0;
        }
        return 0;
    }

    sortAndDisplayData() {
        this.affiliateData.sort((a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];

            // Handle string comparisons
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (this.sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        this.displayLeaderboard();
    }

    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        const button = document.getElementById('sort-order');
        const icon = button.querySelector('i');
        
        if (this.sortOrder === 'asc') {
            icon.className = 'fas fa-sort-amount-up';
        } else {
            icon.className = 'fas fa-sort-amount-down';
        }

        this.sortAndDisplayData();
    }

    displayLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        
        if (this.affiliateData.length === 0) {
            leaderboard.innerHTML = this.getEmptyState();
            return;
        }

        const leaderboardHTML = this.affiliateData.map((affiliate, index) => {
            return this.createLeaderboardItem(affiliate, index + 1);
        }).join('');

        leaderboard.innerHTML = leaderboardHTML;
    }

    createLeaderboardItem(affiliate, rank) {
        const rankClass = this.getRankClass(rank);
        const lastActive = affiliate.last_active ? 
            new Date(affiliate.last_active).toLocaleDateString() : 'Unknown';

        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${rank}</div>
                <div class="affiliate-info">
                    <div class="affiliate-code">${affiliate.code}</div>
                    <div class="affiliate-meta">Last active: ${lastActive}</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.formatCurrency(affiliate.total_wagered)}</div>
                    <div class="metric-label">Total Wagered</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.formatCurrency(affiliate.total_earnings)}</div>
                    <div class="metric-label">Total Earnings</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${affiliate.users_registered.toLocaleString()}</div>
                    <div class="metric-label">Users</div>
                </div>
            </div>
        `;
    }

    getRankClass(rank) {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>No Data Found</h3>
                <p>No data found for Colby's affiliate code in October 2025.</p>
                <p>This could be due to:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>No activity in the specified date range</li>
                    <li>API connection issues</li>
                    <li>Domain not whitelisted for CORS</li>
                </ul>
            </div>
        `;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const leaderboard = document.getElementById('leaderboard');
        
        if (show) {
            loading.style.display = 'flex';
            // Hide existing content
            const items = leaderboard.querySelectorAll('.leaderboard-item, .empty-state');
            items.forEach(item => item.style.display = 'none');
        } else {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        errorText.textContent = message;
        errorElement.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        const errorElement = document.getElementById('error-message');
        errorElement.style.display = 'none';
    }


}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WagerLeaderboard();
});