// functions/api/proxy.ts
// This file is used by Cloudflare Pages Functions to handle API proxying

export async function onRequest(context: any) {
  const { request } = context;

  // 1. Handle CORS Preflight
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

  // 2. Debugging: Handle GET to verify function is active
  if (request.method === "GET") {
    return new Response(JSON.stringify({ status: "active", message: "Insight Canvas Proxy is running" }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 3. Only handle POST for actual proxying
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: `Method ${request.method} not allowed. Please use POST.` }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Allow': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const bodyData = await request.json();
    const { url: targetUrl, method, headers, body } = bodyData as any;

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' in request body" }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Perform the proxy request
    const response = await fetch(targetUrl, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await response.json();
    
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "Proxy request failed", 
      message: error.message 
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
