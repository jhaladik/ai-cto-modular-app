// Permission Display Component
// Path: /js/components/permissions-display.js

class PermissionsDisplay {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.permissions = null;
    }

    async loadPermissions() {
        try {
            const response = await this.apiClient.kamRequest('/permissions/my-permissions', 'GET');
            if (response.success) {
                this.permissions = response.permissions;
                return this.permissions;
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
        }
        return null;
    }

    renderTierBadge(tier, displayName) {
        const tierColors = {
            basic: '#6b7280',
            standard: '#3b82f6',
            premium: '#8b5cf6',
            enterprise: '#dc2626'
        };

        return `
            <span class="tier-badge" style="
                background: ${tierColors[tier]}20;
                color: ${tierColors[tier]};
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.875rem;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            ">
                ${this.getTierIcon(tier)} ${displayName}
            </span>
        `;
    }

    getTierIcon(tier) {
        const icons = {
            basic: '🟢',
            standard: '🔵',
            premium: '🟣',
            enterprise: '🔴'
        };
        return icons[tier] || '⚪';
    }

    renderUsageBar(used, limit, type = 'default') {
        if (limit === -1) {
            return `<div class="usage-unlimited">Unlimited</div>`;
        }

        const percentage = Math.min(100, (used / limit) * 100);
        const color = percentage > 90 ? 'var(--danger)' : 
                     percentage > 70 ? 'var(--warning)' : 
                     'var(--success)';

        return `
            <div class="usage-bar-container">
                <div class="usage-bar" style="
                    width: 100%;
                    height: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                ">
                    <div class="usage-bar-fill" style="
                        width: ${percentage}%;
                        height: 100%;
                        background: ${color};
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <div class="usage-text" style="
                    display: flex;
                    justify-content: space-between;
                    margin-top: 0.25rem;
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                ">
                    <span>${used.toLocaleString()} used</span>
                    <span>${limit.toLocaleString()} limit</span>
                </div>
            </div>
        `;
    }

    renderCompactView() {
        if (!this.permissions) return '';

        const { tier, tierDisplayName, usage } = this.permissions;

        return `
            <div class="permissions-compact">
                ${this.renderTierBadge(tier, tierDisplayName)}
                <div class="usage-summary" style="
                    display: flex;
                    gap: 1rem;
                    margin-top: 0.5rem;
                    font-size: 0.875rem;
                ">
                    <span>
                        <strong>${usage.requests.used}</strong>/${usage.requests.limit === -1 ? '∞' : usage.requests.limit} requests
                    </span>
                    <span>
                        <strong>${usage.users.current}</strong>/${usage.users.limit === -1 ? '∞' : usage.users.limit} users
                    </span>
                </div>
            </div>
        `;
    }

    renderFullView() {
        if (!this.permissions) return '';

        const { tier, tierDisplayName, features, limits, usage } = this.permissions;

        return `
            <div class="permissions-full">
                <div class="permissions-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                ">
                    <h2>Your Subscription</h2>
                    ${this.renderTierBadge(tier, tierDisplayName)}
                </div>

                <!-- Usage Stats -->
                <div class="usage-grid" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                ">
                    <div class="usage-card">
                        <h3 style="font-size: 1rem; margin-bottom: 1rem;">API Requests</h3>
                        ${this.renderUsageBar(usage.requests.used, usage.requests.limit)}
                        ${usage.requests.remaining !== -1 ? 
                            `<p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                                ${usage.requests.remaining} requests remaining this month
                            </p>` : ''
                        }
                    </div>

                    <div class="usage-card">
                        <h3 style="font-size: 1rem; margin-bottom: 1rem;">Team Members</h3>
                        ${this.renderUsageBar(usage.users.current, usage.users.limit)}
                        ${!usage.users.canAddMore && usage.users.limit !== -1 ? 
                            `<p style="font-size: 0.875rem; color: var(--danger); margin-top: 0.5rem;">
                                User limit reached. Upgrade to add more users.
                            </p>` : ''
                        }
                    </div>
                </div>

                <!-- Features -->
                <div class="features-section">
                    <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Available Features</h3>
                    <div class="features-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 0.75rem;
                    ">
                        ${this.renderFeatures(features)}
                    </div>
                </div>

                <!-- Limits -->
                <div class="limits-section" style="margin-top: 2rem;">
                    <h3 style="font-size: 1.125rem; margin-bottom: 1rem;">Plan Limits</h3>
                    <div class="limits-table">
                        ${this.renderLimits(limits)}
                    </div>
                </div>

                ${tier !== 'enterprise' ? `
                    <div class="upgrade-prompt" style="
                        margin-top: 2rem;
                        padding: 1.5rem;
                        background: var(--primary)10;
                        border: 1px solid var(--primary)30;
                        border-radius: var(--radius-lg);
                        text-align: center;
                    ">
                        <h4 style="margin-bottom: 0.5rem;">Need more features?</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                            Upgrade your plan to unlock additional features and higher limits.
                        </p>
                        <button class="btn btn-primary" onclick="window.location.href='#/upgrade'">
                            View Upgrade Options
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderFeatures(features) {
        const featureNames = {
            dashboard_access: '📊 Dashboard Access',
            basic_requests: '💬 Basic AI Requests',
            bulk_operations: '📦 Bulk Operations',
            request_history: '📜 Request History',
            basic_analytics: '📈 Basic Analytics',
            advanced_analytics: '📊 Advanced Analytics',
            custom_templates: '📝 Custom Templates',
            api_access: '🔌 API Access',
            priority_processing: '⚡ Priority Processing',
            export_data: '💾 Data Export',
            white_label: '🏷️ White Label',
            sso_integration: '🔐 SSO Integration',
            custom_workflows: '🔄 Custom Workflows',
            dedicated_support: '🎯 Dedicated Support',
            audit_logs: '📋 Audit Logs'
        };

        return features.map(feature => `
            <div class="feature-item" style="
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem;
                background: var(--bg-secondary);
                border-radius: var(--radius);
            ">
                <span style="color: var(--success);">✓</span>
                <span style="font-size: 0.875rem;">${featureNames[feature] || feature}</span>
            </div>
        `).join('');
    }

    renderLimits(limits) {
        const limitRows = [
            { label: 'Monthly Requests', value: limits.monthly_requests, format: 'number' },
            { label: 'Max Users', value: limits.max_users, format: 'number' },
            { label: 'API Rate Limit', value: limits.api_rate_limit, unit: '/min', format: 'number' },
            { label: 'Data Retention', value: limits.data_retention_days, unit: ' days', format: 'days' },
            { label: 'Priority Support', value: limits.priority_support, format: 'boolean' },
            { label: 'Custom Integrations', value: limits.custom_integrations, format: 'boolean' },
            { label: 'Advanced Analytics', value: limits.advanced_analytics, format: 'boolean' },
            { label: 'White Label', value: limits.white_label, format: 'boolean' }
        ];

        return `
            <table class="limits-table" style="width: 100%; font-size: 0.875rem;">
                ${limitRows.map(row => `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 0.75rem; color: var(--text-secondary);">${row.label}</td>
                        <td style="padding: 0.75rem; text-align: right; font-weight: 500;">
                            ${this.formatLimitValue(row.value, row.format, row.unit)}
                        </td>
                    </tr>
                `).join('')}
            </table>
        `;
    }

    formatLimitValue(value, format, unit = '') {
        switch (format) {
            case 'number':
                return value === -1 ? 'Unlimited' : value.toLocaleString() + unit;
            case 'days':
                return value === -1 ? 'Forever' : value + unit;
            case 'boolean':
                return value ? 
                    '<span style="color: var(--success);">✓ Included</span>' : 
                    '<span style="color: var(--text-tertiary);">-</span>';
            default:
                return value;
        }
    }
}

// Export for use
window.PermissionsDisplay = PermissionsDisplay;