/**
 * PaperScope arXiv API CORS Proxy
 * 
 * 【部署方法】
 * 方法 A（推荐）- Wrangler CLI:
 *   1. 安装: npm install -g wrangler
 *   2. 登录: wrangler login
 *   3. 部署: wrangler deploy worker.js --name paperscope-api
 *
 * 方法 B - Cloudflare Dashboard:
 *   1. 进入 Workers & Pages → Create → Create Worker
 *   2. 点击 Edit Code
 *   3. 删除默认代码，粘贴本文件全部内容
 *   4. 点击 Save and Deploy
 *
 * 方法 C - Wrangler 配置文件:
 *   创建 wrangler.toml:
 *     name = "paperscope-api"
 *     main = "worker.js"
 *     compatibility_date = "2024-01-01"
 *   然后运行: wrangler deploy
 */

const ARXIV_API_BASE = 'https://export.arxiv.org/api/';

// 缓存 300 秒
const CACHE_TTL = 300;

function isOriginAllowed(origin) {
  if (!origin) return false;
  // 允许 localhost
  if (origin.startsWith('http://localhost')) return true;
  // 允许所有 https 来源
  if (origin.startsWith('https://')) return true;
  return false;
}

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isOriginAllowed(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ===== Service Worker 格式（兼容旧版编辑器和 ES Module 编辑器）=====
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
  const url = new URL(request.url);

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request.headers.get('Origin')),
    });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 根路径：返回代理状态信息（方便调试）
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(
      JSON.stringify({
        service: 'PaperScope CORS Proxy',
        status: 'running',
        usage: 'Append /api/query?search_query=... to proxy arXiv API requests',
        example: url.origin + '/api/query?search_query=all:test&max_results=1',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin')),
        },
      }
    );
  }

  try {
    // 构建转发到 arXiv 的完整 URL
    // 请求格式: /api/query?search_query=...&start=0&max_results=10
    const targetUrl = ARXIV_API_BASE + url.pathname.replace(/^\//, '') + url.search;

    // 安全验证：确保目标 URL 确实是 arXiv API
    if (!targetUrl.startsWith(ARXIV_API_BASE)) {
      return new Response(
        JSON.stringify({ error: 'Invalid target URL. Only arXiv API requests are allowed.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request.headers.get('Origin')),
          },
        }
      );
    }

    // 检查缓存
    const cache = caches.default;
    const cacheKey = new Request(targetUrl, request);
    let cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      const newHeaders = new Headers(cachedResponse.headers);
      const origin = request.headers.get('Origin');
      newHeaders.set('Access-Control-Allow-Origin', isOriginAllowed(origin) ? origin : '*');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: newHeaders,
      });
    }

    // 转发请求到 arXiv API
    const arxivResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'PaperScope/1.0 (https://github.com/milksalute/paperscope)',
        'Accept': 'application/atom+xml',
      },
    });

    // 创建响应并添加 CORS 头
    const origin = request.headers.get('Origin');
    const responseHeaders = new Headers(arxivResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', isOriginAllowed(origin) ? origin : '*');
    responseHeaders.set('X-Proxied-By', 'PaperScope-CORS-Proxy');

    const response = new Response(arxivResponse.body, {
      status: arxivResponse.status,
      statusText: arxivResponse.statusText,
      headers: responseHeaders,
    });

    // 缓存成功的响应
    if (arxivResponse.ok) {
      const cacheResponse = response.clone();
      cacheResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      event.waitUntil(cache.put(cacheKey, cacheResponse));
    }

    return response;

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin')),
        },
      }
    );
  }
}
