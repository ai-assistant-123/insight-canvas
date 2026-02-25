// src/worker.ts
export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. 处理 API 路由
    if (url.pathname.startsWith('/api/')) {
      
      // 处理 CORS 预检
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

      // 调试接口
      if (url.pathname === '/api/proxy' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: "active", message: "Worker Proxy is running" }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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

      return new Response("Method not allowed", { status: 405 });
    }

    // 2. 其他所有请求交给静态资源处理 (env.ASSETS)
    // 这会自动处理 SPA 路由回退到 index.html
    return env.ASSETS.fetch(request);
  },
};
