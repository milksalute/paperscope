/**
 * PaperScope arXiv API CORS Proxy
 * 部署在 Cloudflare Workers 上，为前端页面提供 arXiv API 的跨域访问支持
 * 
 * 部署步骤：
 * 1. 注册 Cloudflare 账号 https://dash.cloudflare.com/sign-up
 * 2. 进入 Workers & Pages → 创建 Worker
 * 3. 将此文件的全部内容粘贴到在线编辑器中
 * 4. 点击 Deploy 部署
 * 5. 复制分配的 URL（格式如 https://xxx.your-name.workers.dev）
 * 6. 将 URL 填入 index.html 中的 API_PROXY_URL 常量
 */

const ARXIV_API_BASE = 'https://export.arxiv.org/api/';

// 允许访问此代理的来源（防止滥用）
const ALLOWED_ORIGINS = [
  'http://localhost',
  'https://milksalute.github.io',
  'https://your-username.github.io',  // 替换为你的 GitHub Pages 地址
  // 添加更多允许的来源...
];

// 缓存设置：arXiv API 数据变化不频繁，缓存 300 秒可减少请求
const CACHE_TTL = 300;

function isOriginAllowed(origin) {
  // 允许所有 localhost 来源（方便本地开发）
  if (origin && origin.startsWith('http://localhost')) return true;
  // 允许所有 https 来源（GitHub Pages 等）
  if (origin && origin.startsWith('https://')) return true;
  return false;
}

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isOriginAllowed(origin) ? (origin || '*') : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request.headers.get('Origin')),
      });
    }

    // 只允许 GET 请求（arXiv API 是只读的）
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // 构建转发到 arXiv 的完整 URL
      // 请求格式: /api/query?search_query=...&start=0&max_results=10
      const targetUrl = ARXIV_API_BASE + url.pathname.replace(/^\//, '') + url.search;

      // 验证目标 URL 确实是 arXiv API
      if (!targetUrl.startsWith(ARXIV_API_BASE)) {
        return new Response('Invalid target', { status: 400 });
      }

      // 检查缓存
      const cache = caches.default;
      const cacheKey = new Request(targetUrl, request);
      let response = await cache.match(cacheKey);

      if (response) {
        // 添加 CORS 头后返回缓存
        const origin = request.headers.get('Origin');
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', isOriginAllowed(origin) ? (origin || '*') : '*');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
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
      responseHeaders.set('Access-Control-Allow-Origin', isOriginAllowed(origin) ? (origin || '*') : '*');
      responseHeaders.set('X-Proxied-By', 'PaperScope-CORS-Proxy');

      response = new Response(arxivResponse.body, {
        status: arxivResponse.status,
        statusText: arxivResponse.statusText,
        headers: responseHeaders,
      });

      // 仅缓存成功的响应
      if (arxivResponse.ok) {
        response = new Response(response.body, response);
        response.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
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
  },
};
