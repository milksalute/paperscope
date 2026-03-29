export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 根路径：返回代理状态
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({
        service: 'PaperScope CORS Proxy',
        status: 'running',
        example: url.origin + '/api/query?search_query=all:test&max_results=1',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }

    try {
      // 拼接 arXiv API 的完整 URL
      const targetUrl = 'https://export.arxiv.org/api/' + url.pathname.slice(1) + url.search;

      // 安全检查：只允许转发到 arXiv
      if (!targetUrl.startsWith('https://export.arxiv.org/api/')) {
        return new Response(JSON.stringify({ error: 'Invalid target' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        });
      }

      // 转发请求到 arXiv
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'PaperScope/1.0',
          'Accept': 'application/atom+xml',
        },
      });

      // 读取响应内容，手动添加 CORS 头返回
      const body = await resp.text();
      const headers = new Headers();
      headers.set('Content-Type', resp.headers.get('Content-Type') || 'application/xml');
      headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('X-Proxied-By', 'PaperScope');

      return new Response(body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: headers,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }
  },
};

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
