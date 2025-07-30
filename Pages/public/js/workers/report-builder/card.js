// public/js/workers/report-builder/card.js
// Report Builder Dashboard Card - Minimal working version

export class ReportBuilderCard {
  constructor(kamContext) {
    this.workerId = 'report-builder';
    this.title = '📊 Report Builder';
    this.description = 'Transform analyzed content into actionable intelligence reports';
    this.kamContext = kamContext;
    this.isExecuting = false;
  }

  render() {
    return `
      <div class="worker-card-content">
        <div class="worker-header">
          <h4>${this.title}</h4>
          <p>${this.description}</p>
        </div>
        
        <div class="quick-actions">
          <select id="report-type-${this.workerId}" style="width: 100%; margin-bottom: 10px;">
            <option value="executive">Executive Summary</option>
            <option value="trends">Trend Analysis</option>
            <option value="competitive">Competitive Intelligence</option>
            <option value="briefing">Daily Briefing</option>
          </select>
          <select id="time-range-${this.workerId}" style="width: 100%; margin-bottom: 10px;">
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button class="btn btn-primary" onclick="this.generateQuickReport()" style="width: 100%;">
            📊 Generate Report
          </button>
        </div>
        
        <div class="worker-stats">
          <div class="stat">
            <span class="label">Status:</span>
            <span class="value">Ready</span>
          </div>
          <div class="stat">
            <span class="label">Last Report:</span>
            <span class="value">1 hour ago</span>
          </div>
        </div>
      </div>
    `;
  }

  async mount() {
    console.log(`✅ ${this.title} card mounted`);
  }

  async unmount() {
    // Component cleanup
  }

  generateQuickReport() {
    const reportType = document.getElementById(`report-type-${this.workerId}`).value;
    const timeRange = document.getElementById(`time-range-${this.workerId}`).value;
    
    console.log(`Generating ${reportType} report for ${timeRange}`);
    alert(`Generating ${reportType} report for ${timeRange}`);
  }

  getQuickStats() {
    return {
      'Recent Reports': 15,
      'Avg Gen Time': '45s',
      'Success Rate': '98%',
      'Total Cost': '$23.50'
    };
  }

  async getWorkerStatus() {
    return {
      status: 'healthy',
      message: 'Ready for report generation'
    };
  }
}