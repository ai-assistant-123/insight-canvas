// functions/api/proxy.ts
// This file is used by Cloudflare Pages Functions to handle API proxying
export const onRequestPost: any = async (context: any) => {
  const { request } = context;
  
  try {
    const { url, method, headers, body } = await request.json() as any;

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing target URL" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS Preflight
export const onRequestOptions: any = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
