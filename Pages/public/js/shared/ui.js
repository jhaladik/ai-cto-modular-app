// public/js/shared/ui.js
// @WORKER: UIHelpers
// 🧱 Type: BrowserClient  
// 📍 Path: public/js/shared/ui.js
// 🎯 Role: Common UI utilities and helpers
// 💾 Storage: { browser: "DOM" }

class UIHelpers {
    static showElement(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = 'block';
      }
    }
  
    static hideElement(elementId) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = 'none';
      }
    }
  
    static showError(message, containerId = 'error-container') {
      const container = document.getElementById(containerId);
      if (container) {
        container.textContent = message;
        container.style.display = 'block';
        container.className = 'error-message';
      }
    }
  
    static hideError(containerId = 'error-container') {
      const container = document.getElementById(containerId);
      if (container) {
        container.style.display = 'none';
      }
    }
  
    static updateStatusDot(elementId, status) {
      const element = document.getElementById(elementId);
      if (element) {
        const dot = element.querySelector('.status-dot');
        const text = element.querySelector('span:last-child');
        
        if (dot && text) {
          dot.className = 'status-dot';
          
          switch (status) {
            case 'online':
              dot.classList.add('status-online');
              text.textContent = 'Online';
              break;
            case 'offline':
              dot.classList.add('status-offline');
              text.textContent = 'Offline';
              break;
            case 'loading':
              dot.classList.add('status-loading');
              text.textContent = 'Checking...';
              break;
            default:
              dot.classList.add('status-unknown');
              text.textContent = 'Unknown';
          }
        }
      }
    }
  
    static formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString();
    }
  
    static createWorkerCard(worker) {
      return `
        <div class="worker-card" data-worker="${worker.name}">
          <div class="worker-icon">${worker.icon}</div>
          <h3>${worker.title}</h3>
          <p>${worker.description}</p>
          <button class="btn-primary worker-btn" data-worker="${worker.name}">
            ${worker.buttonText}
          </button>
        </div>
      `;
    }
  
    static showLoading(show = true) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = show ? 'flex' : 'none';
      }
    }
  
    static async delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  // Global UI helpers
  window.UI = UIHelpers;