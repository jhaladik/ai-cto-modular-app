import { Env, DataReference } from '../types';

export class StorageManager {
  private env: Env;
  private compressionThreshold: number = 1024 * 10; // 10KB
  private kvMaxSize: number = 1024 * 1024 * 25; // 25MB KV limit
  
  constructor(env: Env) {
    this.env = env;
  }

  async storeData(
    executionId: string,
    stageId: string,
    data: any,
    dataType: 'input' | 'output' | 'checkpoint' | 'deliverable'
  ): Promise<DataReference> {
    const serialized = JSON.stringify(data);
    const sizeBytes = new TextEncoder().encode(serialized).length;
    const checksum = await this.generateChecksum(serialized);
    const timestamp = Date.now();
    const key = `${dataType}/${executionId}/${stageId}/${timestamp}`;

    if (sizeBytes < 1024) {
      return {
        ref_id: `ref_${timestamp}`,
        storage_type: 'inline',
        storage_key: '',
        inline_data: data,
        size_bytes: sizeBytes,
        content_type: 'application/json',
        checksum,
        compression: 'none',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString()
      } as any;
    }

    let compression: 'none' | 'gzip' | 'brotli' = 'none';
    let compressedData = serialized;

    if (sizeBytes > this.compressionThreshold) {
      compressedData = await this.compress(serialized);
      compression = 'gzip';
    }

    if (sizeBytes < this.kvMaxSize) {
      await this.env.DATA_REFS.put(key, compressedData, {
        expirationTtl: 86400,
        metadata: {
          executionId,
          stageId,
          dataType,
          compression,
          originalSize: sizeBytes,
          checksum
        }
      });

      return {
        ref_id: `ref_${timestamp}`,
        storage_type: 'KV',
        storage_key: key,
        size_bytes: sizeBytes,
        content_type: 'application/json',
        checksum,
        compression,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString()
      } as any;
    }

    await this.env.DATA_STORAGE.put(key, compressedData, {
      httpMetadata: {
        contentType: 'application/json',
        contentEncoding: compression === 'gzip' ? 'gzip' : undefined
      },
      customMetadata: {
        executionId,
        stageId,
        dataType,
        originalSize: sizeBytes.toString(),
        checksum
      }
    });

    return {
      ref_id: `ref_${timestamp}`,
      storage_type: 'R2',
      storage_key: key,
      size_bytes: sizeBytes,
      content_type: 'application/json',
      checksum,
      compression,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: new Date().toISOString()
    } as any;
  }

  async retrieveData(dataRef: DataReference | any): Promise<any> {
    if (dataRef.storage_type === 'inline') {
      return dataRef.inline_data;
    }

    if (dataRef.storage_type === 'KV') {
      const stored = await this.env.DATA_REFS.getWithMetadata(dataRef.storage_key);
      if (!stored.value) {
        throw new Error(`Data not found in KV: ${dataRef.storage_key}`);
      }

      let data = stored.value;
      if ((stored.metadata as any)?.compression === 'gzip' || dataRef.compression === 'gzip') {
        data = await this.decompress(data);
      }

      return JSON.parse(data);
    }

    if (dataRef.storage_type === 'R2') {
      const object = await this.env.DATA_STORAGE.get(dataRef.storage_key);
      if (!object) {
        throw new Error(`Data not found in R2: ${dataRef.storage_key}`);
      }

      let data = await object.text();
      const metadata = object.customMetadata;
      
      if (metadata?.compression === 'gzip' || dataRef.compression === 'gzip') {
        data = await this.decompress(data);
      }

      return JSON.parse(data);
    }

    throw new Error(`Unknown storage type: ${dataRef.storage_type}`);
  }

  async storeDeliverable(
    executionId: string,
    name: string,
    data: any,
    type: 'report' | 'data' | 'file' | 'visualization'
  ): Promise<any> {
    const deliverableId = `deliv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataRef = await this.storeData(executionId, deliverableId, data, 'deliverable');

    const format = this.detectFormat(data);
    const mimeType = this.getMimeType(format);

    await this.env.DB.prepare(`
      INSERT INTO deliverables (
        deliverable_id, execution_id, client_id, name, type,
        format, storage_type, storage_reference, size_bytes,
        mime_type, preview_available, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      deliverableId,
      executionId,
      'default_client',
      name,
      type,
      format,
      dataRef.storage_type,
      dataRef.storage_key || JSON.stringify(dataRef),
      dataRef.size_bytes,
      mimeType,
      format === 'json' || format === 'html'
    ).run();

    return {
      deliverable_id: deliverableId,
      name,
      type,
      format,
      storage_reference: dataRef.storage_key || deliverableId,
      size_bytes: dataRef.size_bytes,
      mime_type: mimeType,
      preview_available: format === 'json' || format === 'html'
    };
  }

  async copyData(
    sourceRef: DataReference | any,
    targetExecutionId: string,
    targetStageId: string
  ): Promise<DataReference> {
    const data = await this.retrieveData(sourceRef);
    return await this.storeData(targetExecutionId, targetStageId, data, 'output');
  }

  async deleteData(dataRef: DataReference | any): Promise<void> {
    if (dataRef.storage_type === 'KV') {
      await this.env.DATA_REFS.delete(dataRef.storage_key);
    } else if (dataRef.storage_type === 'R2') {
      await this.env.DATA_STORAGE.delete(dataRef.storage_key);
    }
  }

  async cleanupExpiredData(): Promise<number> {
    let deletedCount = 0;

    const expiredRefs = await this.env.DB.prepare(`
      SELECT * FROM data_references 
      WHERE expires_at < datetime('now')
      AND storage_type IN ('KV', 'R2')
      LIMIT 100
    `).all();

    for (const ref of expiredRefs.results || []) {
      try {
        await this.deleteData(ref);
        
        await this.env.DB.prepare(`
          DELETE FROM data_references WHERE ref_id = ?
        `).bind(ref.ref_id).run();
        
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete expired data ${ref.ref_id}:`, error);
      }
    }

    return deletedCount;
  }

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async compress(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(data)]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    const buffer = await compressedBlob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private async decompress(data: string): Promise<string> {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const decompressedBlob = await new Response(decompressedStream).blob();
    return await decompressedBlob.text();
  }

  private detectFormat(data: any): string {
    if (typeof data === 'string') {
      if (data.startsWith('<!DOCTYPE') || data.startsWith('<html>')) return 'html';
      if (data.startsWith('%PDF')) return 'pdf';
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'text';
      }
    }
    
    if (Array.isArray(data)) {
      if (data.every(row => Array.isArray(row))) return 'csv';
    }
    
    return 'json';
  }

  private getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      'json': 'application/json',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'text': 'text/plain',
      'xml': 'application/xml'
    };
    
    return mimeTypes[format] || 'application/octet-stream';
  }

  async getStorageStats(): Promise<any> {
    const kvList = await this.env.DATA_REFS.list({ limit: 1000 });
    const r2List = await this.env.DATA_STORAGE.list({ limit: 1000 });

    const kvStats = {
      count: kvList.keys.length,
      approximate_size_mb: kvList.keys.reduce((sum, key) => {
        return sum + ((key.metadata as any)?.originalSize || 0) / (1024 * 1024);
      }, 0)
    };

    const r2Stats = {
      count: r2List.objects.length,
      total_size_gb: r2List.objects.reduce((sum, obj) => {
        return sum + (obj.size || 0) / (1024 * 1024 * 1024);
      }, 0)
    };

    return {
      kv: kvStats,
      r2: r2Stats,
      total_objects: kvStats.count + r2Stats.count
    };
  }
}