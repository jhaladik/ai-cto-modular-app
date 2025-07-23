// AI Factory Frontend Worker - Static Asset Serving
// @WORKER: FrontendWorker
// 🧱 Type: StaticAssetModule
// 📍 Path: src/static/assets.ts
// 🎯 Role: Serve embedded static HTML, CSS, JavaScript files
// 💾 Storage: { embedded: "worker_code" }

interface Env {
    CACHE_STATIC_ASSETS: string;
    STATIC_CACHE_TTL_SECONDS: string;
    ENABLE_DEBUG_LOGGING: string;
  }
  
  // ==================== STATIC ASSETS MAP ====================
  const STATIC_ASSETS: Record<string, { content: string; contentType: string; cacheable: boolean }> = {};
  
  // Load static assets (these will be populated during build)
  import { DASHBOARD_HTML } from './html/dashboard';
  import { ORCHESTRATOR_HTML } from './html/orchestrator';
  import { TOPIC_RESEARCHER_HTML } from './html/topic-researcher';
  import { RSS_LIBRARIAN_HTML } from './html/rss-librarian';
  import { FEED_FETCHER_HTML } from './html/feed-fetcher';
  import { CONTENT_CLASSIFIER_HTML } from './html/content-classifier';
  import { REPORT_BUILDER_HTML } from './html/report-builder';
  import { SHARED_CSS } from './css/shared.ts';
  import { COMPONENTS_CSS } from './css/components.ts';
  import { API_JS } from './js/api.ts';
  import { AUTH_JS } from './js/auth.ts';
  import { UI_JS } from './js/ui.ts';
  
  // Populate assets map
  STATIC_ASSETS['/dashboard.html'] = { content: DASHBOARD_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/orchestrator/index.html'] = { content: ORCHESTRATOR_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/topic-researcher/index.html'] = { content: TOPIC_RESEARCHER_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/rss-librarian/index.html'] = { content: RSS_LIBRARIAN_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/feed-fetcher/index.html'] = { content: FEED_FETCHER_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/content-classifier/index.html'] = { content: CONTENT_CLASSIFIER_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/report-builder/index.html'] = { content: REPORT_BUILDER_HTML, contentType: 'text/html', cacheable: true };
  STATIC_ASSETS['/static/css/shared.css'] = { content: SHARED_CSS, contentType: 'text/css', cacheable: true };
  STATIC_ASSETS['/static/css/components.css'] = { content: COMPONENTS_CSS, contentType: 'text/css', cacheable: true };
  STATIC_ASSETS['/static/js/api.js'] = { content: API_JS, contentType: 'application/javascript', cacheable: true };
  STATIC_ASSETS['/static/js/auth.js'] = { content: AUTH_JS, contentType: 'application/javascript', cacheable: true };
  STATIC_ASSETS['/static/js/ui.js'] = { content: UI_JS, contentType: 'application/javascript', cacheable: true };
  
  // Favicon (simple data URI)
  const FAVICON_ICO = 'data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAA';
  STATIC_ASSETS['/favicon.ico'] = { content: FAVICON_ICO, contentType: 'image/x-icon', cacheable: true };
  
  // ==================== CACHE HEADERS ====================
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token',
  };
  
  // ==================== SERVE STATIC ASSET ====================
  export async function serveStaticAsset(path: string, env: Env): Promise<Response> {
    try {
      // Normalize path
      let normalizedPath = path;
      if (path === '/' || path === '') {
        normalizedPath = '/dashboard.html';
      }
      
      // Handle static file requests
      if (path.startsWith('/static/')) {
        normalizedPath = path;
      }
      
      // Debug logging
      if (env.ENABLE_DEBUG_LOGGING === 'true') {
        console.log(`📁 Serving static asset: ${normalizedPath}`);
      }
      
      // Check if asset exists
      const asset = STATIC_ASSETS[normalizedPath];
      if (!asset) {
        return new Response('Not Found', { 
          status: 404,
          headers: CORS_HEADERS
        });
      }
      
      // Prepare response headers
      const headers = {
        ...CORS_HEADERS,
        'Content-Type': asset.contentType,
      };
      
      // Add caching headers if enabled and asset is cacheable
      if (env.CACHE_STATIC_ASSETS === 'true' && asset.cacheable) {
        const cacheTtl = parseInt(env.STATIC_CACHE_TTL_SECONDS) || 3600;
        headers['Cache-Control'] = `public, max-age=${cacheTtl}`;
        headers['ETag'] = `"${hashString(asset.content)}"`;
      } else {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }
      
      return new Response(asset.content, {
        status: 200,
        headers: headers
      });
      
    } catch (error) {
      console.error('Static asset serving error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  // ==================== ASSET VALIDATION ====================
  export function validateAssets(): { valid: boolean; missing: string[] } {
    const requiredAssets = [
      '/dashboard.html',
      '/orchestrator/index.html',
      '/topic-researcher/index.html',
      '/rss-librarian/index.html',
      '/feed-fetcher/index.html',
      '/content-classifier/index.html',
      '/report-builder/index.html',
      '/static/css/shared.css',
      '/static/js/api.js',
      '/static/js/auth.js'
    ];
    
    const missing: string[] = [];
    
    for (const asset of requiredAssets) {
      if (!STATIC_ASSETS[asset]) {
        missing.push(asset);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing: missing
    };
  }
  
  // ==================== ASSET MANIFEST ====================
  export function getAssetManifest(): Record<string, any> {
    const manifest: Record<string, any> = {};
    
    for (const [path, asset] of Object.entries(STATIC_ASSETS)) {
      manifest[path] = {
        contentType: asset.contentType,
        size: asset.content.length,
        cacheable: asset.cacheable,
        hash: hashString(asset.content)
      };
    }
    
    return manifest;
  }