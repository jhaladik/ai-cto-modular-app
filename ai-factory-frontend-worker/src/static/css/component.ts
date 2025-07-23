// AI Factory Frontend Worker - Component-specific CSS
// @WORKER: FrontendWorker
// 🧱 Type: StaticCSS
// 📍 Path: src/static/css/components.ts
// 🎯 Role: Component-specific styling for worker interfaces
// 💾 Storage: { embedded: "worker_code" }

export const COMPONENTS_CSS = `
/* AI Factory Frontend - Component-specific Styles */

/* Worker Interface Styles */
.worker-interface {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
}

.worker-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
}

.worker-header h1 {
    margin: 0 0 10px 0;
    font-size: 2rem;
}

.worker-header p {
    margin: 0;
    opacity: 0.9;
}

/* Form Styles */
.form-container {
    background: white;
    border-radius: 8px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 30px;
}

.form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.form-col {
    flex: 1;
}

.form-col-2 {
    flex: 2;
}

.form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

/* Results Display */
.results-container {
    background: white;
    border-radius: 8px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 30px;
}

.results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
}

.results-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
}

.stat-item {
    text-align: center;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #3498db;
    margin-bottom: 5px;
}

.stat-label {
    font-size: 0.8rem;
    color: #6c757d;
    text-transform: uppercase;
}

/* Data Tables */
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

.data-table th {
    background: #f8f9fa;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
}

.data-table td {
    padding: 12px;
    border-bottom: 1px solid #dee2e6;
    vertical-align: top;
}

.data-table tbody tr:hover {
    background: #f8f9fa;
}

.data-table .actions {
    white-space: nowrap;
}

.data-table .actions button {
    margin-right: 5px;
    padding: 4px 8px;
    font-size: 0.8rem;
}

/* Cards and Lists */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.info-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.3s ease;
}

.info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.info-card h3 {
    margin: 0 0 15px 0;
    color: #2c3e50;
}

.info-list {
    list-style: none;
    padding: 0;
    margin: 15px 0;
}

.info-list li {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.info-list li:last-child {
    border-bottom: none;
}

.info-label {
    font-weight: 500;
    color: #555;
}

.info-value {
    color: #333;
}

/* Progress Indicators */
.progress-container {
    margin: 15px 0;
}

.progress-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.9rem;
}

.progress-bar-container {
    background: #e9ecef;
    border-radius: 10px;
    height: 8px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
    border-radius: 10px;
}

/* Tags and Badges */
.tag-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0;
}

.tag {
    display: inline-block;
    padding: 4px 12px;
    background: #e9ecef;
    color: #495057;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
}

.tag.primary {
    background: #007bff;
    color: white;
}

.tag.success {
    background: #28a745;
    color: white;
}

.tag.warning {
    background: #ffc107;
    color: #212529;
}

.tag.danger {
    background: #dc3545;
    color: white;
}

/* Collapsible Sections */
.collapsible {
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin: 10px 0;
}

.collapsible-header {
    background: #f8f9fa;
    padding: 15px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
}

.collapsible-header:hover {
    background: #e9ecef;
}

.collapsible-content {
    padding: 20px;
    display: none;
}

.collapsible.active .collapsible-content {
    display: block;
}

.collapsible-toggle {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
}

.collapsible.active .collapsible-toggle {
    transform: rotate(180deg);
}

/* Code Display */
.code-container {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin: 15px 0;
}

.code-header {
    background: #e9ecef;
    padding: 10px 15px;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.code-content {
    padding: 15px;
    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    overflow-x: auto;
}

.copy-button {
    background: #6c757d;
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
}

.copy-button:hover {
    background: #5a6268;
}

/* Timeline */
.timeline {
    position: relative;
    padding-left: 30px;
}

.timeline::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #dee2e6;
}

.timeline-item {
    position: relative;
    margin-bottom: 30px;
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: -23px;
    top: 8px;
    width: 12px;
    height: 12px;
    background: #007bff;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #dee2e6;
}

.timeline-content {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 15px;
}

.timeline-time {
    font-size: 0.8rem;
    color: #6c757d;
    margin-bottom: 5px;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .form-row {
        flex-direction: column;
        gap: 0;
    }
    
    .form-actions {
        flex-direction: column;
    }
    
    .form-actions .btn {
        margin-bottom: 10px;
    }
    
    .results-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .results-stats {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .data-table {
        font-size: 0.9rem;
    }
    
    .data-table th,
    .data-table td {
        padding: 8px;
    }
    
    .card-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .timeline {
        padding-left: 20px;
    }
    
    .timeline::before {
        left: 10px;
    }
    
    .timeline-item::before {
        left: -18px;
        width: 8px;
        height: 8px;
    }
}

@media (max-width: 480px) {
    .worker-interface {
        padding: 10px;
    }
    
    .worker-header {
        padding: 15px;
    }
    
    .worker-header h1 {
        font-size: 1.5rem;
    }
    
    .form-container,
    .results-container {
        padding: 20px;
    }
    
    .results-stats {
        grid-template-columns: 1fr;
    }
    
    .data-table {
        font-size: 0.8rem;
    }
    
    .tag-container {
        gap: 4px;
    }
    
    .tag {
        font-size: 0.7rem;
        padding: 2px 8px;
    }
}

/* Animation Classes */
.fade-in {
    animation: fadeIn 0.5s ease-in;
}

.slide-in {
    animation: slideIn 0.3s ease-out;
}

.pulse {
    animation: pulse 2s infinite;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
`;