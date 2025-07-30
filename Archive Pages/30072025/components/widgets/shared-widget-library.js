/**
 * Phase 2: Shared Widget Library
 * Common UI components extracted from existing worker patterns
 */

// =============================================================================
// TOPIC INPUT COMPONENT
// =============================================================================

/**
 * Smart topic input with KAM-powered suggestions
 * Extracted from existing worker input patterns
 */
class TopicInputWidget {
    constructor(config = {}) {
        this.id = config.id || `topic-input-${Date.now()}`;
        this.placeholder = config.placeholder || 'Enter topic...';
        this.suggestions = config.suggestions || true;
        this.recentTopics = config.recentTopics || true;
        this.kamContext = config.kamContext;
        this.onChange = config.onChange || (() => {});
        
        this.suggestionData = [];
        this.recentData = [];
    }

    async render() {
        // Load suggestions if enabled
        if (this.suggestions && this.kamContext) {
            await this.loadSuggestions();
        }

        if (this.recentTopics && this.kamContext) {
            await this.loadRecentTopics();
        }

        return `
            <div class="topic-input-widget">
                <div class="input-group">
                    <input 
                        type="text" 
                        id="${this.id}"
                        class="topic-input"
                        placeholder="${this.placeholder}"
                        ${this.suggestions ? `list="${this.id}-suggestions"` : ''}
                        autocomplete="off"
                    >
                    <button type="button" class="input-addon-btn" onclick="this.showTopicHelper()">
                        💡
                    </button>
                </div>
                
                ${this.suggestions ? this.renderSuggestions() : ''}
                ${this.recentTopics ? this.renderRecentTopics() : ''}
                
                <div class="topic-validation" id="${this.id}-validation" style="display: none;"></div>
            </div>
        `;
    }

    renderSuggestions() {
        return `
            <datalist id="${this.id}-suggestions">
                ${this.suggestionData.map(s => `<option value="${s}">`).join('')}
            </datalist>
        `;
    }

    renderRecentTopics() {
        if (this.recentData.length === 0) return '';

        return `
            <div class="recent-topics">
                <label class="recent-label">Recent topics:</label>
                <div class="topic-chips">
                    ${this.recentData.map(topic => `
                        <span class="topic-chip" onclick="this.selectTopic('${topic}')">
                            ${topic}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async loadSuggestions() {
        try {
            // Get suggestions from KAM based on client history and tier
            const context = await this.kamContext.getContext();
            const preferences = await this.kamContext.getPreferences();
            
            // Mock suggestions based on subscription tier
            const tierSuggestions = {
                basic: ['market research', 'competitor analysis', 'trend analysis'],
                standard: ['market research', 'competitor analysis', 'trend analysis', 'SWOT analysis', 'customer insights'],
                premium: ['market research', 'competitor analysis', 'trend analysis', 'SWOT analysis', 'customer insights', 'industry deep dive', 'strategic planning'],
                enterprise: ['market research', 'competitor analysis', 'trend analysis', 'SWOT analysis', 'customer insights', 'industry deep dive', 'strategic planning', 'custom analysis', 'executive briefing']
            };

            this.suggestionData = tierSuggestions[context?.subscription_tier] || tierSuggestions.basic;
            
        } catch (error) {
            console.warn('Could not load topic suggestions:', error);
            this.suggestionData = ['market research', 'analysis', 'report'];
        }
    }

    async loadRecentTopics() {
        try {
            // Get recent topics from KAM context or localStorage
            const stored = localStorage.getItem('recent-topics');
            this.recentData = stored ? JSON.parse(stored).slice(0, 5) : [];
            
        } catch (error) {
            console.warn('Could not load recent topics:', error);
            this.recentData = [];
        }
    }

    selectTopic(topic) {
        const input = document.getElementById(this.id);
        if (input) {
            input.value = topic;
            this.onChange(topic);
        }
    }

    getValue() {
        const input = document.getElementById(this.id);
        return input ? input.value.trim() : '';
    }

    setValue(value) {
        const input = document.getElementById(this.id);
        if (input) {
            input.value = value;
        }
    }

    validate() {
        const value = this.getValue();
        const validation = document.getElementById(`${this.id}-validation`);
        
        if (!value) {
            this.showValidation('Topic is required', 'error');
            return false;
        }

        if (value.length < 3) {
            this.showValidation('Topic must be at least 3 characters', 'warning');
            return false;
        }

        this.hideValidation();
        return true;
    }

    showValidation(message, type = 'error') {
        const validation = document.getElementById(`${this.id}-validation`);
        if (validation) {
            validation.className = `topic-validation ${type}`;
            validation.textContent = message;
            validation.style.display = 'block';
        }
    }

    hideValidation() {
        const validation = document.getElementById(`${this.id}-validation`);
        if (validation) {
            validation.style.display = 'none';
        }
    }
}

// =============================================================================
// PROGRESS TRACKER COMPONENT
// =============================================================================

/**
 * Unified progress tracking with cost estimation
 * Extracted from existing worker progress patterns
 */
class ProgressTrackerWidget {
    constructor(config = {}) {
        this.id = config.id || `progress-${Date.now()}`;
        this.stages = config.stages || ['Initializing', 'Processing', 'Completing'];
        this.showCost = config.showCost !== false;
        this.showTime = config.showTime !== false;
        this.kamContext = config.kamContext;
        
        this.currentStage = 0;
        this.startTime = null;
        this.estimatedCost = 0;
        this.actualCost = 0;
    }

    render() {
        return `
            <div class="progress-tracker" id="${this.id}" style="display: none;">
                <div class="progress-header">
                    <h4>Processing...</h4>
                    <button class="progress-close" onclick="this.hide()">×</button>
                </div>
                
                <div class="progress-stages">
                    ${this.stages.map((stage, i) => `
                        <div class="stage ${i === this.currentStage ? 'active' : ''} ${i < this.currentStage ? 'completed' : ''}">
                            <div class="stage-icon">${this.getStageIcon(stage, i)}</div>
                            <div class="stage-info">
                                <span class="stage-name">${stage}</span>
                                <span class="stage-status" id="${this.id}-stage-${i}"></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" id="${this.id}-fill" style="width: 0%"></div>
                </div>
                
                <div class="progress-metrics">
                    ${this.showTime ? this.renderTimeMetric() : ''}
                    ${this.showCost ? this.renderCostMetric() : ''}
                </div>
                
                <div class="progress-details" id="${this.id}-details">
                    <span class="progress-message">Initializing...</span>
                </div>
            </div>
        `;
    }

    renderTimeMetric() {
        return `
            <div class="metric time-metric">
                <span class="metric-label">⏱️ Time:</span>
                <span class="metric-value" id="${this.id}-time">0s</span>
            </div>
        `;
    }

    renderCostMetric() {
        return `
            <div class="metric cost-metric">
                <span class="metric-label">💰 Cost:</span>
                <span class="metric-value" id="${this.id}-cost">$0.00</span>
                <span class="metric-estimated" id="${this.id}-estimated"></span>
            </div>
        `;
    }

    getStageIcon(stage, index) {
        const icons = ['🔄', '⚙️', '📊', '✅', '🎯'];
        return icons[index] || '●';
    }

    show() {
        const element = document.getElementById(this.id);
        if (element) {
            element.style.display = 'block';
            this.startTime = Date.now();
            this.startTimeUpdater();
        }
    }

    hide() {
        const element = document.getElementById(this.id);
        if (element) {
            element.style.display = 'none';
        }
        this.stopTimeUpdater();
    }

    advance(stageName, message = '') {
        const index = this.stages.indexOf(stageName);
        if (index >= 0) {
            this.currentStage = index;
            this.updateDisplay();
            
            if (message) {
                this.updateMessage(message);
            }
        }
    }

    complete(message = 'Processing complete!') {
        this.currentStage = this.stages.length;
        this.updateDisplay();
        this.updateMessage(message);
        
        // Auto-hide after 3 seconds
        setTimeout(() => this.hide(), 3000);
    }

    error(message = 'An error occurred') {
        this.updateMessage(`❌ ${message}`, 'error');
    }

    updateDisplay() {
        // Update stage indicators
        const stageElements = document.querySelectorAll(`#${this.id} .stage`);
        stageElements.forEach((el, i) => {
            el.className = `stage ${i === this.currentStage ? 'active' : ''} ${i < this.currentStage ? 'completed' : ''}`;
        });

        // Update progress bar
        const progressFill = document.getElementById(`${this.id}-fill`);
        if (progressFill) {
            const percentage = ((this.currentStage + 1) / this.stages.length) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }
    }

    updateMessage(message, type = 'info') {
        const details = document.getElementById(`${this.id}-details`);
        if (details) {
            details.className = `progress-details ${type}`;
            details.innerHTML = `<span class="progress-message">${message}</span>`;
        }
    }

    updateCost(estimated, actual = null) {
        this.estimatedCost = estimated;
        if (actual !== null) {
            this.actualCost = actual;
        }

        const costElement = document.getElementById(`${this.id}-cost`);
        const estimatedElement = document.getElementById(`${this.id}-estimated`);
        
        if (costElement) {
            const displayCost = actual !== null ? actual : estimated;
            costElement.textContent = `$${displayCost.toFixed(2)}`;
        }

        if (estimatedElement && actual === null) {
            estimatedElement.textContent = `(est. $${estimated.toFixed(2)})`;
        } else if (estimatedElement && actual !== null) {
            estimatedElement.textContent = estimated !== actual ? `(est. $${estimated.toFixed(2)})` : '';
        }
    }

    startTimeUpdater() {
        this.timeInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const timeElement = document.getElementById(`${this.id}-time`);
                if (timeElement) {
                    timeElement.textContent = `${elapsed}s`;
                }
            }
        }, 1000);
    }

    stopTimeUpdater() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
    }
}

// =============================================================================
// RESULTS TABLE COMPONENT
// =============================================================================

/**
 * Configurable results table with export functionality
 * Extracted from existing result display patterns
 */
class ResultsTableWidget {
    constructor(config = {}) {
        this.id = config.id || `results-${Date.now()}`;
        this.columns = config.columns || [];
        this.data = config.data || [];
        this.exportEnabled = config.exportEnabled !== false;
        this.sortEnabled = config.sortEnabled !== false;
        this.filterEnabled = config.filterEnabled !== false;
        this.paginated = config.paginated || false;
        this.pageSize = config.pageSize || 25;
        this.kamContext = config.kamContext;
        
        this.currentPage = 0;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filterText = '';
    }

    render() {
        return `
            <div class="results-table-widget" id="${this.id}">
                ${this.renderHeader()}
                ${this.renderFilters()}
                ${this.renderTable()}
                ${this.renderPagination()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <div class="table-header">
                <div class="table-title">
                    <h3>Results (${this.getFilteredData().length})</h3>
                </div>
                <div class="table-actions">
                    ${this.exportEnabled ? this.renderExportButtons() : ''}
                </div>
            </div>
        `;
    }

    renderExportButtons() {
        return `
            <div class="export-buttons">
                <button class="btn btn-sm" onclick="this.exportCSV()">📊 CSV</button>
                <button class="btn btn-sm" onclick="this.exportJSON()">📄 JSON</button>
                <button class="btn btn-sm" onclick="this.exportPDF()">📑 PDF</button>
            </div>
        `;
    }

    renderFilters() {
        if (!this.filterEnabled) return '';

        return `
            <div class="table-filters">
                <div class="filter-group">
                    <input 
                        type="text" 
                        id="${this.id}-filter"
                        class="filter-input"
                        placeholder="Filter results..."
                        onkeyup="this.handleFilter(event)"
                    >
                    <button class="filter-clear" onclick="this.clearFilter()">×</button>
                </div>
            </div>
        `;
    }

    renderTable() {
        const filteredData = this.getFilteredData();
        const pageData = this.paginated ? this.getPageData(filteredData) : filteredData;

        return `
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            ${this.columns.map(col => `
                                <th class="${this.sortEnabled ? 'sortable' : ''}" 
                                    onclick="${this.sortEnabled ? `this.handleSort('${col.key}')` : ''}">
                                    ${col.label}
                                    ${this.sortColumn === col.key ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${pageData.map(row => this.renderRow(row)).join('')}
                    </tbody>
                </table>
                
                ${pageData.length === 0 ? this.renderEmptyState() : ''}
            </div>
        `;
    }

    renderRow(row) {
        return `
            <tr>
                ${this.columns.map(col => `
                    <td class="${col.className || ''}">
                        ${this.formatCellValue(row[col.key], col)}
                    </td>
                `).join('')}
            </tr>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h4>No results found</h4>
                <p>Try adjusting your filters or search criteria.</p>
            </div>
        `;
    }

    renderPagination() {
        if (!this.paginated) return '';

        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.pageSize);
        
        if (totalPages <= 1) return '';

        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    Showing ${this.currentPage * this.pageSize + 1}-${Math.min((this.currentPage + 1) * this.pageSize, filteredData.length)} 
                    of ${filteredData.length} results
                </div>
                <div class="pagination-controls">
                    <button onclick="this.goToPage(0)" ${this.currentPage === 0 ? 'disabled' : ''}>First</button>
                    <button onclick="this.goToPage(${this.currentPage - 1})" ${this.currentPage === 0 ? 'disabled' : ''}>Previous</button>
                    <span class="page-numbers">
                        Page ${this.currentPage + 1} of ${totalPages}
                    </span>
                    <button onclick="this.goToPage(${this.currentPage + 1})" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>Next</button>
                    <button onclick="this.goToPage(${totalPages - 1})" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>Last</button>
                </div>
            </div>
        `;
    }

    formatCellValue(value, column) {
        if (value === null || value === undefined) return '-';

        // Apply column-specific formatting
        if (column.format) {
            switch (column.format) {
                case 'currency':
                    return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
                case 'percentage':
                    return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value;
                case 'date':
                    return new Date(value).toLocaleDateString();
                case 'datetime':
                    return new Date(value).toLocaleString();
                case 'truncate':
                    return value.length > 50 ? value.substring(0, 47) + '...' : value;
                default:
                    return value;
            }
        }

        return value;
    }

    // Data manipulation methods
    setData(data) {
        this.data = data;
        this.refresh();
    }

    addRow(row) {
        this.data.push(row);
        this.refresh();
    }

    getFilteredData() {
        let filtered = [...this.data];

        // Apply text filter
        if (this.filterText) {
            filtered = filtered.filter(row => {
                return this.columns.some(col => {
                    const value = row[col.key];
                    return value && value.toString().toLowerCase().includes(this.filterText.toLowerCase());
                });
            });
        }

        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aVal = a[this.sortColumn];
                const bVal = b[this.sortColumn];
                
                let comparison = 0;
                if (aVal < bVal) comparison = -1;
                if (aVal > bVal) comparison = 1;
                
                return this.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        return filtered;
    }

    getPageData(data) {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        return data.slice(start, end);
    }

    // Event handlers
    handleFilter(event) {
        this.filterText = event.target.value;
        this.currentPage = 0; // Reset to first page
        this.refresh();
    }

    clearFilter() {
        this.filterText = '';
        const filterInput = document.getElementById(`${this.id}-filter`);
        if (filterInput) {
            filterInput.value = '';
        }
        this.refresh();
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.refresh();
    }

    goToPage(page) {
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.pageSize);
        
        if (page >= 0 && page < totalPages) {
            this.currentPage = page;
            this.refresh();
        }
    }

    // Export methods
    exportCSV() {
        const data = this.getFilteredData();
        const csv = this.convertToCSV(data);
        this.downloadFile(csv, 'results.csv', 'text/csv');
    }

    exportJSON() {
        const data = this.getFilteredData();
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'results.json', 'application/json');
    }

    exportPDF() {
        // This would require a PDF library - for now, just alert
        alert('PDF export would require additional PDF generation library');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = this.columns.map(col => col.label).join(',');
        const rows = data.map(row => 
            this.columns.map(col => {
                const value = row[col.key];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        );

        return [headers, ...rows].join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    refresh() {
        const container = document.getElementById(this.id);
        if (container) {
            container.innerHTML = this.render();
        }
    }
}

// =============================================================================
// EXPORT MANAGER COMPONENT
// =============================================================================

/**
 * Advanced export functionality with format options
 * Extracted from existing export patterns
 */
class ExportManagerWidget {
    constructor(config = {}) {
        this.id = config.id || `export-${Date.now()}`;
        this.data = config.data || [];
        this.formats = config.formats || ['csv', 'json', 'pdf'];
        this.kamContext = config.kamContext;
        this.sessionId = config.sessionId;
        
        this.isExporting = false;
    }

    render() {
        return `
            <div class="export-manager" id="${this.id}">
                <div class="export-header">
                    <h4>📤 Export Results</h4>
                </div>
                
                <div class="export-options">
                    ${this.renderFormatOptions()}
                    ${this.renderAdvancedOptions()}
                </div>
                
                <div class="export-actions">
                    <button class="btn btn-primary" onclick="this.executeExport()" id="${this.id}-export-btn">
                        Export Data
                    </button>
                    <button class="btn btn-secondary" onclick="this.showPreview()">
                        Preview
                    </button>
                </div>
                
                <div class="export-status" id="${this.id}-status" style="display: none;"></div>
            </div>
        `;
    }

    renderFormatOptions() {
        return `
            <div class="format-options">
                <label class="option-label">Export Format:</label>
                <div class="format-buttons">
                    ${this.formats.map(format => `
                        <label class="format-option">
                            <input type="radio" name="${this.id}-format" value="${format}" ${format === 'csv' ? 'checked' : ''}>
                            <span class="format-label">${format.toUpperCase()}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAdvancedOptions() {
        return `
            <div class="advanced-options">
                <details>
                    <summary>Advanced Options</summary>
                    <div class="option-group">
                        <label>
                            <input type="checkbox" id="${this.id}-include-metadata" checked>
                            Include metadata
                        </label>
                        <label>
                            <input type="checkbox" id="${this.id}-include-timestamp" checked>
                            Include timestamp
                        </label>
                        <label>
                            <input type="checkbox" id="${this.id}-compress">
                            Compress file
                        </label>
                    </div>
                </details>
            </div>
        `;
    }

    async executeExport() {
        if (this.isExporting) return;

        try {
            this.isExporting = true;
            this.updateStatus('Preparing export...', 'info');
            
            const format = this.getSelectedFormat();
            const options = this.getExportOptions();
            
            // Track usage if KAM context available
            if (this.kamContext) {
                await this.kamContext.trackUsage('export', 0.01, { format, records: this.data.length });
            }

            let content, filename, mimeType;
            
            switch (format) {
                case 'csv':
                    content = this.generateCSV(options);
                    filename = `export_${this.getTimestamp()}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'json':
                    content = this.generateJSON(options);
                    filename = `export_${this.getTimestamp()}.json`;
                    mimeType = 'application/json';
                    break;
                case 'pdf':
                    await this.generatePDF(options);
                    return; // PDF generation handles download internally
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.downloadFile(content, filename, mimeType);
            this.updateStatus('Export completed successfully!', 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.updateStatus(`Export failed: ${error.message}`, 'error');
        } finally {
            this.isExporting = false;
            this.resetExportButton();
        }
    }

    getSelectedFormat() {
        const selected = document.querySelector(`input[name="${this.id}-format"]:checked`);
        return selected ? selected.value : 'csv';
    }

    getExportOptions() {
        return {
            includeMetadata: document.getElementById(`${this.id}-include-metadata`)?.checked || false,
            includeTimestamp: document.getElementById(`${this.id}-include-timestamp`)?.checked || false,
            compress: document.getElementById(`${this.id}-compress`)?.checked || false
        };
    }

    generateCSV(options) {
        if (this.data.length === 0) return '';

        const headers = Object.keys(this.data[0]);
        let csvContent = headers.join(',') + '\n';
        
        csvContent += this.data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        ).join('\n');

        if (options.includeMetadata) {
            csvContent += `\n\n# Metadata\n`;
            csvContent += `# Exported: ${new Date().toISOString()}\n`;
            csvContent += `# Records: ${this.data.length}\n`;
            if (this.sessionId) {
                csvContent += `# Session: ${this.sessionId}\n`;
            }
        }

        return csvContent;
    }

    generateJSON(options) {
        const exportData = {
            data: this.data
        };

        if (options.includeMetadata) {
            exportData.metadata = {
                exported: new Date().toISOString(),
                records: this.data.length,
                session_id: this.sessionId,
                format: 'json'
            };
        }

        return JSON.stringify(exportData, null, 2);
    }

    async generatePDF(options) {
        // This would require a PDF library like jsPDF
        // For now, create a simple HTML-to-PDF fallback
        const htmlContent = this.generateHTMLReport(options);
        
        // Open print dialog as fallback
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
        
        this.updateStatus('PDF print dialog opened', 'info');
    }

    generateHTMLReport(options) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Export Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .metadata { margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <h1>Export Report</h1>
                ${this.generateHTMLTable()}
                ${options.includeMetadata ? this.generateHTMLMetadata() : ''}
            </body>
            </html>
        `;
    }

    generateHTMLTable() {
        if (this.data.length === 0) return '<p>No data to display</p>';

        const headers = Object.keys(this.data[0]);
        
        return `
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${this.data.map(row => 
                        `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    }

    generateHTMLMetadata() {
        return `
            <div class="metadata">
                <h3>Metadata</h3>
                <p>Exported: ${new Date().toISOString()}</p>
                <p>Records: ${this.data.length}</p>
                ${this.sessionId ? `<p>Session: ${this.sessionId}</p>` : ''}
            </div>
        `;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    updateStatus(message, type) {
        const status = document.getElementById(`${this.id}-status`);
        if (status) {
            status.className = `export-status ${type}`;
            status.textContent = message;
            status.style.display = 'block';
            
            // Auto-hide success messages
            if (type === 'success') {
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            }
        }

        // Update export button
        const exportBtn = document.getElementById(`${this.id}-export-btn`);
        if (exportBtn) {
            if (this.isExporting) {
                exportBtn.disabled = true;
                exportBtn.textContent = 'Exporting...';
            }
        }
    }

    resetExportButton() {
        const exportBtn = document.getElementById(`${this.id}-export-btn`);
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = 'Export Data';
        }
    }

    getTimestamp() {
        return new Date().toISOString().replace(/[:.-]/g, '').substring(0, 15);
    }

    showPreview() {
        const format = this.getSelectedFormat();
        const options = this.getExportOptions();
        
        let previewContent;
        switch (format) {
            case 'csv':
                previewContent = this.generateCSV(options);
                break;
            case 'json':
                previewContent = this.generateJSON(options);
                break;
            default:
                previewContent = 'Preview not available for this format';
        }

        // Show preview in modal or new window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        previewWindow.document.write(`
            <html>
                <head><title>Export Preview</title></head>
                <body>
                    <h2>Export Preview (${format.toUpperCase()})</h2>
                    <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${previewContent}</pre>
                </body>
            </html>
        `);
    }
}

// =============================================================================
// EXPORT ALL WIDGETS
// =============================================================================

window.TopicInputWidget = TopicInputWidget;
window.ProgressTrackerWidget = ProgressTrackerWidget;
window.ResultsTableWidget = ResultsTableWidget;
window.ExportManagerWidget = ExportManagerWidget;

console.log('✅ Shared Widget Library loaded!');