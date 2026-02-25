// functions/api/[[path]].ts
// This is a catch-all handler for any request starting with /api/

export async function onRequest(context: any) {
  const { request, params } = context;
  const path = params.path; // This will be ["proxy"] for /api/proxy

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

  // 2. Debugging: Handle GET /api/status or similar
  if (request.method === "GET") {
    return new Response(JSON.stringify({ 
      status: "active", 
      message: "Insight Canvas API Gateway is running",
      path: path
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 3. Proxy Logic (Only for POST)
  if (request.method === "POST") {
    try {
      const bodyData = await request.json();
      const { url: targetUrl, method, headers, body } = bodyData as any;

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing 'url' in request body" }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${request.method} not allowed` }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
