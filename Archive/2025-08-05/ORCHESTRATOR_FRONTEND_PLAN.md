# Orchestrator 2.0 Frontend Design Plan

## 🎯 Objective
Create a comprehensive frontend for Orchestrator 2.0 within the existing AI Factory admin layout, serving as a template for all worker frontends.

## 🏗️ Architecture Overview

### Navigation Integration
Add to the AI Workers section in `ai-factory-layout.js`:
```javascript
{
    title: 'AI Workers',
    items: [
        { path: '/orchestrator', icon: '🎛️', label: 'Orchestrator 2.0' }, // NEW
        { path: '/workers/topic-researcher', icon: '🔎', label: 'Topic Researcher' }, // NEW
        { path: '/workers/universal-researcher', icon: '🔍', label: 'Universal Researcher' },
        // ... other workers
    ]
}
```

## 📊 Orchestrator Dashboard Components

### 1. **Main Dashboard View** (`orchestrator-page.js`)
```
┌─────────────────────────────────────────────────────────┐
│ 🎛️ Orchestrator 2.0 Control Center                      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ Active      │ │ Queue       │ │ Resources   │        │
│ │ Pipelines   │ │ Length      │ │ Usage       │        │
│ │    12       │ │    45       │ │   67%       │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                          │
│ [Pipeline Manager] [Resource Monitor] [Worker Status]    │
│ [Execution History] [Template Editor] [System Logs]      │
└─────────────────────────────────────────────────────────┘
```

### 2. **Tab-Based Interface**
- **Pipeline Manager**: Execute, monitor, and manage pipelines
- **Resource Monitor**: Real-time resource tracking
- **Worker Status**: Health and availability of all workers
- **Execution History**: Past executions with filtering
- **Template Editor**: Create/edit pipeline templates
- **System Logs**: Debugging and monitoring

## 🎨 Component Structure

### Core Components

#### 1. **Pipeline Manager Tab**
```javascript
// Features:
- Execute Pipeline (form with template selection)
- Active Executions (real-time progress)
- Queue Management (priority adjustment)
- Cost Estimation (before execution)
```

#### 2. **Resource Monitor Tab**
```javascript
// Features:
- Resource Pool Visualization (gauges/charts)
- API Quota Tracking (OpenAI, Anthropic)
- Storage Usage (KV, R2, D1)
- Cost Tracking (real-time spend)
```

#### 3. **Worker Status Tab**
```javascript
// Features:
- Worker Registry Grid
- Health Status Indicators
- Performance Metrics
- Protocol Version Info
- Handshake Test Tool
```

#### 4. **Execution History Tab**
```javascript
// Features:
- Searchable/Filterable List
- Execution Details Modal
- Stage-by-Stage Breakdown
- Resource Usage Per Execution
- Export Capabilities
```

#### 5. **Template Editor Tab**
```javascript
// Features:
- JSON Editor with Validation
- Visual Pipeline Builder (drag-drop)
- Template Testing
- Cost/Time Estimation
- Version Control
```

## 🔧 Technical Implementation

### File Structure
```
/public/js/components/orchestrator/
├── orchestrator-page.js          # Main page controller
├── pipeline-manager.js           # Pipeline execution UI
├── resource-monitor.js           # Resource tracking UI
├── worker-status.js              # Worker health monitoring
├── execution-history.js          # Historical data viewer
├── template-editor.js            # Template management
├── orchestrator-api.js           # API client for orchestrator
└── orchestrator-utils.js         # Shared utilities
```

### API Integration Points
```javascript
class OrchestratorAPI {
    // Pipeline Operations
    async executePipeline(template, parameters)
    async getExecutionStatus(executionId)
    async cancelExecution(executionId)
    async getQueue()
    
    // Resource Management
    async getResourceStatus()
    async getResourceHistory(timeRange)
    async checkAvailability(resources)
    
    // Worker Management
    async getWorkerStatus()
    async testHandshake(workerName)
    async getWorkerMetrics(workerName)
    
    // Template Management
    async getTemplates()
    async saveTemplate(template)
    async validateTemplate(template)
    async estimateCost(template, parameters)
}
```

## 🎯 UI/UX Features

### 1. **Real-Time Updates**
- WebSocket/SSE for execution progress
- Live resource usage gauges
- Worker health heartbeat
- Queue position updates

### 2. **Interactive Elements**
- Drag-and-drop pipeline builder
- Interactive cost calculator
- Resource allocation simulator
- Visual execution timeline

### 3. **Data Visualization**
- Resource usage charts (Chart.js)
- Pipeline flow diagrams
- Cost breakdown pie charts
- Performance trend lines

### 4. **Smart Features**
- Auto-suggest optimal resource allocation
- Predictive cost estimation
- Failure prediction warnings
- Bottleneck identification

## 🔄 Reusable Worker Template

### Standard Worker Page Structure
```javascript
class WorkerPage {
    constructor(workerName, workerConfig) {
        this.tabs = [
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'execute', label: 'Execute', icon: '▶️' },
            { id: 'history', label: 'History', icon: '📜' },
            { id: 'config', label: 'Configuration', icon: '⚙️' },
            { id: 'logs', label: 'Logs', icon: '📋' }
        ];
    }
    
    // Standard methods all workers implement
    renderOverview() { /* Stats, health, capabilities */ }
    renderExecute() { /* Input form, parameter config */ }
    renderHistory() { /* Past executions for this worker */ }
    renderConfig() { /* Worker-specific settings */ }
    renderLogs() { /* Debug logs, errors */ }
}
```

### Worker-Specific Customization
```javascript
// Example: Topic Researcher
class TopicResearcherPage extends WorkerPage {
    constructor() {
        super('topic_researcher', {
            inputSchema: {
                topic: { type: 'string', required: true },
                depth: { type: 'number', min: 1, max: 10 },
                minQuality: { type: 'number', min: 0, max: 1 }
            },
            outputPreview: 'table', // or 'json', 'html', 'chart'
            specialFeatures: ['ai-reasoning', 'source-validation']
        });
    }
}
```

## 📱 Responsive Design

### Mobile Adaptations
- Collapsible sidebar
- Swipeable tabs
- Touch-friendly controls
- Simplified visualizations
- Progressive disclosure

### Desktop Optimizations
- Multi-panel layouts
- Keyboard shortcuts
- Bulk operations
- Advanced filtering
- Export capabilities

## 🚀 Implementation Phases

### Phase 1: Core Structure (Day 1)
- [ ] Create orchestrator-page.js
- [ ] Add navigation entry
- [ ] Basic tab structure
- [ ] API client setup

### Phase 2: Pipeline Manager (Day 2)
- [ ] Execution form
- [ ] Active executions list
- [ ] Progress tracking
- [ ] Queue management

### Phase 3: Resource Monitor (Day 3)
- [ ] Resource gauges
- [ ] Usage charts
- [ ] Cost tracking
- [ ] Alerts system

### Phase 4: Worker Management (Day 4)
- [ ] Worker grid
- [ ] Health monitoring
- [ ] Handshake testing
- [ ] Performance metrics

### Phase 5: Advanced Features (Day 5)
- [ ] Template editor
- [ ] Execution history
- [ ] Visual pipeline builder
- [ ] Export/import

## 🎨 Design System Integration

### Consistent Components
- Use existing `ui-components.js` classes
- Follow `admin-modern.css` styling
- Maintain color scheme and spacing
- Reuse modal and toast patterns

### New Components
- Resource gauge widget
- Pipeline flow diagram
- Worker status card
- Execution timeline
- Cost breakdown chart

## 📊 Success Metrics

1. **Usability**: Can execute pipeline in < 3 clicks
2. **Visibility**: All critical info on dashboard
3. **Performance**: Updates in < 100ms
4. **Scalability**: Handle 1000+ executions in history
5. **Reusability**: 80% code shared between workers

## 🔑 Key Decisions

1. **Tab-based navigation** for organization
2. **Real-time updates** via WebSocket/SSE
3. **Visual pipeline builder** for non-technical users
4. **Modular architecture** for easy extension
5. **Responsive design** for all devices

---

This plan creates a powerful, user-friendly interface for Orchestrator 2.0 while establishing patterns that all worker frontends can follow.