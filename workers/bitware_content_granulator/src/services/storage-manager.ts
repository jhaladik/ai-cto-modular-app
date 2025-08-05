import { Env } from '../types';

export class StorageManager {
  constructor(private env: Env) {}

  async storeStructure(jobId: number, structure: any, size: number): Promise<{ type: 'inline' | 'kv' | 'r2'; location?: string }> {
    // Determine storage type based on size
    const sizeKB = size / 1024;
    
    if (sizeKB < 25) {
      // Small structures: return inline
      return { type: 'inline' };
    } else if (sizeKB < 128) {
      // Medium structures: store in KV
      const key = `structure:${jobId}`;
      await this.env.JOB_CACHE.put(key, JSON.stringify(structure), {
        expirationTtl: 86400 * 7 // 7 days
      });
      return { type: 'kv', location: key };
    } else {
      // Large structures: store in R2
      const key = `structures/${jobId}.json`;
      await this.env.STRUCTURE_STORAGE.put(key, JSON.stringify(structure));
      return { type: 'r2', location: key };
    }
  }

  async retrieveStructure(type: 'inline' | 'kv' | 'r2', location?: string, inlineData?: any): Promise<any> {
    switch (type) {
      case 'inline':
        return inlineData;
        
      case 'kv':
        if (!location) throw new Error('KV location required');
        const kvData = await this.env.JOB_CACHE.get(location);
        if (!kvData) throw new Error('Structure not found in KV');
        return JSON.parse(kvData);
        
      case 'r2':
        if (!location) throw new Error('R2 location required');
        const r2Object = await this.env.STRUCTURE_STORAGE.get(location);
        if (!r2Object) throw new Error('Structure not found in R2');
        const r2Data = await r2Object.text();
        return JSON.parse(r2Data);
        
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }

  async cacheTemplate(templateName: string, template: any): Promise<void> {
    await this.env.TEMPLATE_CACHE.put(
      `template:${templateName}`,
      JSON.stringify(template),
      { expirationTtl: 86400 * 30 } // 30 days
    );
  }

  async getCachedTemplate(templateName: string): Promise<any | null> {
    const cached = await this.env.TEMPLATE_CACHE.get(`template:${templateName}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheValidationResult(jobId: number, result: any): Promise<void> {
    await this.env.JOB_CACHE.put(
      `validation:${jobId}`,
      JSON.stringify(result),
      { expirationTtl: 86400 } // 1 day
    );
  }

  async getCachedValidationResult(jobId: number): Promise<any | null> {
    const cached = await this.env.JOB_CACHE.get(`validation:${jobId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async storeProgress(executionId: string, progress: any): Promise<void> {
    await this.env.JOB_CACHE.put(
      `progress:${executionId}`,
      JSON.stringify(progress),
      { expirationTtl: 3600 } // 1 hour
    );
  }

  async getProgress(executionId: string): Promise<any | null> {
    const cached = await this.env.JOB_CACHE.get(`progress:${executionId}`);
    return cached ? JSON.parse(cached) : null;
  }

  getStructureSize(structure: any): number {
    return new TextEncoder().encode(JSON.stringify(structure)).length;
  }
}