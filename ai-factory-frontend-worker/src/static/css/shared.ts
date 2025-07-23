// AI Factory Frontend Worker - Shared CSS Styles
// @WORKER: FrontendWorker
// 🧱 Type: StaticCSS
// 📍 Path: src/static/css/shared.ts
// 🎯 Role: Common styles used across all pages
// 💾 Storage: { embedded: "worker_code" }

export const SHARED_CSS = `
/* AI Factory Frontend - Shared Styles */
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
    min-height: 100vh;
}

/* Layout */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.section {
    margin: 30px 0;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Header */
.header {
    background: #2c3e50;
    color: white;
    padding: 1rem 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h1 {
    margin: 0;
    font-size: 1.8rem;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    float: right;
    margin-top: -40px;
}

/* Navigation */
.nav {
    background: #34495e;
    padding: 0.5rem 0;
}

.nav ul {
    list-style: none;
    display: flex;
    gap: 0;
}

.nav li a {
    color: white;
    text-decoration: none;
    padding: 0.75rem 1rem;
    display: block;
    transition: background 0.3s ease;
}

.nav li a:hover,
.nav li a.active {
    background: #2c3e50;
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    text-decoration: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.3s ease;
    text-align: center;
}

.btn-primary {
    background: #3498db;
    color: white;
}

.btn-primary:hover {
    background: #2980b9;
}

.btn-secondary {
    background: #95a5a6;
    color: white;
}

.btn-secondary:hover {
    background: #7f8c8d;
}

.btn-success {
    background: #27ae60;
    color: white;
}

.btn-success:hover {
    background: #229954;
}

.btn-danger {
    background: #e74c3c;
    color: white;
}

.btn-danger:hover {
    background: #c0392b;
}

.btn-warning {
    background: #f39c12;
    color: white;
}

.btn-warning:hover {
    background: #d68910;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Forms */
.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: #555;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
}

/* Login Form */
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
}

.login-box {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 100%;
    max-width: 400px;
}

.login-box h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #2c3e50;
}

/* Messages */
.message {
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin: 1rem 0;
}

.message-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.message-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.message-warning {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.message-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #b8daff;
}

.error-message {
    color: #e74c3c;
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

/* Tables */
.table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

.table th,
.table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.table th {
    background: #f8f9fa;
    font-weight: 600;
    color: #555;
}

.table tbody tr:hover {
    background: #f8f9fa;
}

/* Cards */
.card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
}

.card-title {
    margin: 0;
    color: #2c3e50;
}

/* Loading Spinner */
.loading-spinner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 9999;
    color: white;
}

.spinner {
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Status Indicators */
.status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
}

.status-online {
    background: #d4edda;
    color: #155724;
}

.status-offline {
    background: #f8d7da;
    color: #721c24;
}

.status-degraded {
    background: #fff3cd;
    color: #856404;
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 0 15px;
    }
    
    .header-controls {
        float: none;
        margin-top: 10px;
        justify-content: center;
    }
    
    .nav ul {
        flex-direction: column;
    }
    
    .section {
        margin: 15px 0;
        padding: 15px;
    }
    
    .login-box {
        margin: 1rem;
        padding: 1.5rem;
    }
    
    .btn {
        width: 100%;
        margin-bottom: 0.5rem;
    }
}

@media (max-width: 480px) {
    .header h1 {
        font-size: 1.4rem;
    }
    
    .container {
        padding: 0 10px;
    }
    
    .section {
        padding: 10px;
    }
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }

.mb-0 { margin-bottom: 0; }
.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }

.p-0 { padding: 0; }
.p-1 { padding: 0.5rem; }
.p-2 { padding: 1rem; }
.p-3 { padding: 1.5rem; }

.d-none { display: none; }
.d-block { display: block; }
.d-inline { display: inline; }
.d-inline-block { display: inline-block; }
.d-flex { display: flex; }

.flex-column { flex-direction: column; }
.flex-row { flex-direction: row; }
.justify-center { justify-content: center; }
.align-center { align-items: center; }

.w-full { width: 100%; }
.h-full { height: 100%; }

/* Theme Colors */
:root {
    --primary-color: #3498db;
    --secondary-color: #95a5a6;
    --success-color: #27ae60;
    --danger-color: #e74c3c;
    --warning-color: #f39c12;
    --info-color: #17a2b8;
    --dark-color: #2c3e50;
    --light-color: #ecf0f1;
}
`;