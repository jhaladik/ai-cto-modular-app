// public/js/core/phase3-integration.js
// Phase 3 Integration - Fixed minimal version without reserved words

class Phase3Manager {
  constructor() {
    this.loadedWorkers = new Map();
    this.workerConfigs = new Map();
    this.currentFullInterface = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing Phase 3 Manager...');
      
      // Load worker configurations
      await this.loadWorkerConfigurations();
      
      // Initialize lazy loading system
      this.setupLazyLoading();
      
      this.initialized = true;
      console.log('✅ Phase 3 Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Phase 3 initialization error:', error);
      throw error;
    }
  }

  async loadWorkerConfigurations() {
    // Phase 3 refactored workers - in order of completion
    const workerIds = ['content-classifier', 'topic-researcher', 'report-builder'];
    
    for (const workerId of workerIds) {
      try {
        // Dynamically import worker config
        const configModule = await import(`/js/workers/${workerId}/config.js`);
        const config = configModule.default || configModule[`${this.toCamelCase(workerId)}Config`];
        
        this.workerConfigs.set(workerId, config);
        console.log(`📋 Loaded config for ${workerId}`);
        
      } catch (error) {
        console.warn(`⚠️ Failed to load config for ${workerId}:`, error);
        // Continue with other workers - some may not be refactored yet
      }
    }
    
    console.log(`✅ Phase 3 configurations loaded: ${this.workerConfigs.size} workers`);
  }

  setupLazyLoading() {
    // Create lazy loading mechanism for worker components
    this.lazyLoader = {
      // Load worker card (immediate)
      loadCard: async (workerId, kamContext) => {
        if (this.loadedWorkers.has(`${workerId}-card`)) {
          const CardClass = this.loadedWorkers.get(`${workerId}-card`);
          return new CardClass(kamContext);
        }

        try {
          const config = this.workerConfigs.get(workerId);
          if (!config?.components?.card) {
            throw new Error(`No card component config for ${workerId}`);
          }

          const cardModule = await import(`/js/workers/${workerId}/${config.components.card.module}`);
          const CardClass = cardModule[config.components.card.class];
          
          this.loadedWorkers.set(`${workerId}-card`, CardClass);
          console.log(`📦 Loaded card component for ${workerId}`);
          
          return new CardClass(kamContext);
          
        } catch (error) {
          console.error(`❌ Failed to load card for ${workerId}:`, error);
          return null;
        }
      }
      
      // Interfaces will be added in Phase 4
    };
  }

  // Public API for dashboard integration
  async loadWorkerCard(workerId, kamContext) {
    return this.lazyLoader.loadCard(workerId, kamContext);
  }

  // Interfaces will be added in Phase 4
  async loadWorkerInterface(workerId, kamContext) {
    console.warn(`Worker interfaces not yet implemented in Phase 3. Use #/workers/${workerId} for full interface.`);
    return null;
  }

  getWorkerConfig(workerId) {
    return this.workerConfigs.get(workerId);
  }

  getAvailableWorkers(kamContext) {
    const available = [];
    
    for (const [workerId, config] of this.workerConfigs) {
      available.push({
        id: workerId,
        name: config.name,
        description: config.description,
        icon: config.icon
      });
    }

    return available;
  }

  // Utility methods
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  // Testing API
  async testPhase3() {
    console.log('🧪 Testing Phase 3 Integration...');
    
    const results = {
      configs: 0,
      cards: 0,
      errors: []
    };

    // Test configurations
    results.configs = this.workerConfigs.size;
    
    // Test card loading
    const testKamContext = {
      userRole: 'admin',
      clientProfile: { subscription_tier: 'enterprise' }
    };

    for (const workerId of this.workerConfigs.keys()) {
      try {
        const card = await this.loadWorkerCard(workerId, testKamContext);
        if (card) results.cards++;
        
      } catch (error) {
        results.errors.push(`${workerId}: ${error.message}`);
      }
    }

    console.log('📊 Phase 3 Test Results:', results);
    return results;
  }
}

// Global instance
window.phase3Manager = new Phase3Manager();

// Add immediate logging to verify file loads
console.log('📦 Phase 3 Integration loaded successfully');

// Testing function for development
window.testPhase3 = () => window.phase3Manager.testPhase3();