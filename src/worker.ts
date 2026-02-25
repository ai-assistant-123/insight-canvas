// src/worker.ts
export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. 处理 API 请求
    // 使用 includes 增加鲁棒性，防止前缀问题
    if (pathname.includes('/api/proxy')) {
      
      // CORS 预检
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      // 调试接口 (GET)
      if (request.method === 'GET') {
        return new Response(JSON.stringify({ 
          status: "active", 
          message: "Insight Canvas Worker Proxy is running",
          path: pathname
        }), {
          headers: { 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 代理逻辑 (POST)
      if (request.method === 'POST') {
        try {
          const bodyData = await request.json() as any;
          const { url: targetUrl, method, headers, body } = bodyData;

          if (!targetUrl) {
            return new Response(JSON.stringify({ error: "Missing target URL" }), { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
            });
          }

          const response = await fetch(targetUrl, {
            method: method || 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? JSON.stringify(body) : undefined
          });

          const data = await response.json();
          return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }
      }
    }

    // 2. 静态资源处理
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      
      // 如果资源不存在 (404) 且不是 API 请求，则返回 index.html (SPA 支持)
      if (assetResponse.status === 404 && !pathname.startsWith('/api/')) {
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      
      return assetResponse;
    } catch (e) {
      // 兜底返回 index.html
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }
  },
};
