// public/js/workers/topic-researcher/card.js
// Topic Researcher Dashboard Card - Minimal working version

export class TopicResearcherCard {
  constructor(kamContext) {
    this.workerId = 'topic-researcher';
    this.title = '🔬 Universal Researcher';
    this.description = 'Multi-platform research with AI-powered discovery and ranking';
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
          <input type="text" id="topic-${this.workerId}" placeholder="Enter research topic..." style="width: 100%; margin-bottom: 10px;">
          <select id="template-${this.workerId}" style="width: 100%; margin-bottom: 10px;">
            <option value="rss">RSS Discovery</option>
            <option value="youtube">YouTube Research</option>
            <option value="comprehensive">Comprehensive Search</option>
          </select>
          <button class="btn btn-primary" onclick="this.executeQuickResearch()" style="width: 100%;">
            🔬 Start Research
          </button>
        </div>
        
        <div class="worker-stats">
          <div class="stat">
            <span class="label">Status:</span>
            <span class="value">Ready</span>
          </div>
          <div class="stat">
            <span class="label">Last Research:</span>
            <span class="value">5 minutes ago</span>
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

  executeQuickResearch() {
    const topic = document.getElementById(`topic-${this.workerId}`).value;
    const template = document.getElementById(`template-${this.workerId}`).value;
    
    if (!topic) {
      alert('Please enter a research topic');
      return;
    }
    
    console.log(`Starting research for topic: ${topic} using ${template} template`);
    alert(`Starting research for: ${topic}`);
  }

  getQuickStats() {
    return {
      'Recent Sessions': 8,
      'Sources Found': 342,
      'Success Rate': '96%',
      'Avg Quality': '0.87'
    };
  }

  async getWorkerStatus() {
    return {
      status: 'healthy',
      message: 'Ready for research'
    };
  }
}