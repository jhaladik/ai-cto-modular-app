import { Env } from '../types';
import { GeneratedContent } from '../types/generation';

interface StorageResult {
  storageType: 'inline' | 'kv' | 'r2';
  location: string;
  size: number;
}

export class StorageManager {
  private readonly INLINE_LIMIT = 25 * 1024;     // 25KB for inline storage
  private readonly KV_LIMIT = 128 * 1024;        // 128KB for KV storage
  private readonly COMPRESSION_THRESHOLD = 10 * 1024; // Compress if > 10KB

  constructor(private env: Env) {}

  async storeContent(
    content: GeneratedContent,
    key: string
  ): Promise<StorageResult> {
    const serialized = JSON.stringify(content);
    const size = new TextEncoder().encode(serialized).length;

    // Determine storage type based on size
    if (size < this.INLINE_LIMIT) {
      // Small enough for inline storage (stored in D1)
      return {
        storageType: 'inline',
        location: key,
        size,
      };
    } else if (size < this.KV_LIMIT) {
      // Use KV storage
      return await this.storeInKV(key, content, size);
    } else {
      // Use R2 for large content
      return await this.storeInR2(key, content, size);
    }
  }

  async retrieveData(
    storageType: 'kv' | 'r2',
    location: string
  ): Promise<any> {
    switch (storageType) {
      case 'kv':
        return await this.retrieveFromKV(location);
      case 'r2':
        return await this.retrieveFromR2(location);
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  }

  private async storeInKV(
    key: string,
    content: GeneratedContent,
    size: number
  ): Promise<StorageResult> {
    const kvKey = `content-${key}`;
    
    try {
      // Check if compression would help
      let dataToStore = JSON.stringify(content);
      let isCompressed = false;

      if (size > this.COMPRESSION_THRESHOLD) {
        try {
          const compressed = await this.compress(dataToStore);
          if (compressed.length < dataToStore.length * 0.8) {
            // Only use compression if it saves >20%
            dataToStore = compressed;
            isCompressed = true;
          }
        } catch (error) {
          console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      // Store with metadata
      await this.env.CONTENT_CACHE.put(
        kvKey,
        dataToStore,
        {
          expirationTtl: 86400 * 7, // 7 days
          metadata: {
            originalSize: size,
            compressed: isCompressed,
            timestamp: new Date().toISOString(),
          },
        }
      );

      return {
        storageType: 'kv',
        location: kvKey,
        size: dataToStore.length,
      };
    } catch (error) {
      console.error('KV storage failed:', error);
      // Fallback to R2
      return await this.storeInR2(key, content, size);
    }
  }

  private async storeInR2(
    key: string,
    content: GeneratedContent,
    size: number
  ): Promise<StorageResult> {
    const r2Key = `content/${key}.json`;
    
    try {
      // Compress large content before storing
      let dataToStore = JSON.stringify(content);
      let contentType = 'application/json';

      if (size > this.COMPRESSION_THRESHOLD) {
        try {
          const compressed = await this.compress(dataToStore);
          dataToStore = compressed;
          contentType = 'application/json+gzip';
        } catch (error) {
          console.warn('Compression failed, storing uncompressed:', error);
        }
      }

      // Store in R2
      await this.env.CONTENT_STORAGE.put(r2Key, dataToStore, {
        httpMetadata: {
          contentType,
        },
        customMetadata: {
          originalSize: size.toString(),
          compressed: contentType.includes('gzip') ? 'true' : 'false',
          timestamp: new Date().toISOString(),
        },
      });

      return {
        storageType: 'r2',
        location: r2Key,
        size: dataToStore.length,
      };
    } catch (error) {
      console.error('R2 storage failed:', error);
      throw new Error(`Failed to store content: ${error}`);
    }
  }

  private async retrieveFromKV(key: string): Promise<any> {
    try {
      const result = await this.env.CONTENT_CACHE.get(key, {
        type: 'text',
        cacheTtl: 3600, // Cache for 1 hour
      });

      if (!result) {
        throw new Error('Content not found in KV storage');
      }

      // Check if content is compressed
      const metadata = await this.env.CONTENT_CACHE.getWithMetadata(key);
      if (metadata?.metadata?.compressed) {
        const decompressed = await this.decompress(result);
        return JSON.parse(decompressed);
      }

      return JSON.parse(result);
    } catch (error) {
      console.error('KV retrieval failed:', error);
      throw new Error(`Failed to retrieve from KV: ${error}`);
    }
  }

  private async retrieveFromR2(key: string): Promise<any> {
    try {
      const object = await this.env.CONTENT_STORAGE.get(key);
      
      if (!object) {
        throw new Error('Content not found in R2 storage');
      }

      const data = await object.text();
      
      // Check if content is compressed
      const isCompressed = object.httpMetadata?.contentType?.includes('gzip') ||
                          object.customMetadata?.compressed === 'true';

      if (isCompressed) {
        const decompressed = await this.decompress(data);
        return JSON.parse(decompressed);
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('R2 retrieval failed:', error);
      throw new Error(`Failed to retrieve from R2: ${error}`);
    }
  }

  private async compress(data: string): Promise<string> {
    // Use CompressionStream API if available
    if (typeof CompressionStream !== 'undefined') {
      const encoder = new TextEncoder();
      const stream = new Response(
        new Blob([encoder.encode(data)])
          .stream()
          .pipeThrough(new CompressionStream('gzip'))
      );
      const compressed = await stream.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(compressed)));
    }
    
    // Fallback: simple compression using repeated string replacement
    // This is not ideal but works for demonstration
    return data; // Return uncompressed if CompressionStream not available
  }

  private async decompress(data: string): Promise<string> {
    // Use DecompressionStream API if available
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const stream = new Response(
          new Blob([bytes])
            .stream()
            .pipeThrough(new DecompressionStream('gzip'))
        );
        const decompressed = await stream.text();
        return decompressed;
      } catch (error) {
        // If decompression fails, assume it's not compressed
        return data;
      }
    }
    
    // Fallback: return as-is if DecompressionStream not available
    return data;
  }

  async deleteContent(storageType: 'inline' | 'kv' | 'r2', location: string): Promise<void> {
    try {
      switch (storageType) {
        case 'kv':
          await this.env.CONTENT_CACHE.delete(location);
          break;
        case 'r2':
          await this.env.CONTENT_STORAGE.delete(location);
          break;
        case 'inline':
          // Inline content is stored in database, handled separately
          break;
      }
    } catch (error) {
      console.error(`Failed to delete content from ${storageType}:`, error);
    }
  }

  async getStorageStats(): Promise<{
    kvUsage: number;
    r2Objects: number;
    estimatedSize: number;
  }> {
    // This is a simplified implementation
    // In production, you'd track usage more precisely
    
    try {
      // List R2 objects to get count
      const r2List = await this.env.CONTENT_STORAGE.list({
        prefix: 'content/',
        limit: 1000,
      });

      return {
        kvUsage: 0, // KV doesn't provide usage stats directly
        r2Objects: r2List.objects.length,
        estimatedSize: r2List.objects.reduce((sum, obj) => sum + (obj.size || 0), 0),
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        kvUsage: 0,
        r2Objects: 0,
        estimatedSize: 0,
      };
    }
  }

  async cleanupOldContent(daysOld: number = 30): Promise<number> {
    let cleaned = 0;
    
    try {
      // Clean up old R2 objects
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const r2List = await this.env.CONTENT_STORAGE.list({
        prefix: 'content/',
        limit: 1000,
      });

      for (const object of r2List.objects) {
        if (object.uploaded && new Date(object.uploaded) < cutoffDate) {
          await this.env.CONTENT_STORAGE.delete(object.key);
          cleaned++;
        }
      }

      // KV has TTL, so it auto-cleans
      
      return cleaned;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return cleaned;
    }
  }
}