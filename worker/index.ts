import { mastra } from '../mastra';

const reviewAgent = mastra.getAgent('codeReviewAgent');

type ReviewRequest = {
  code?: string;
  filename?: string;
  framework?: string;
  context?: string;
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

const REVIEW_PREFIX =
  '请扮演资深前端代码评审者，对下面的代码进行结构化审查。请遵循“总体评价 -> 问题列表 -> 可行动 TODO” 的顺序输出，并使用 Markdown。';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    console.log('[worker] received request', request.method, url.pathname);
    if (request.method === 'POST' && url.pathname === '/api/review') {
      return handleReviewRequest(request);
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response('ok', {
        status: 200,
        headers: corsHeaders({ 'content-type': 'text/plain; charset=utf-8' }),
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

async function handleReviewRequest(request: Request): Promise<Response> {
  let payload: ReviewRequest;

  try {
    payload = (await request.json()) as ReviewRequest;
  } catch {
    return jsonResponse({ error: '请求体必须是合法的 JSON' }, 400);
  }

  if (!payload.code || !payload.code.trim()) {
    return jsonResponse({ error: '请提供需要评审的 code 字段。' }, 400);
  }

  const userPrompt = buildPrompt(payload);

  try {
    const result = await reviewAgent.stream([
      {
        role: 'user',
        content: userPrompt,
      },
    ]);

    let report = '';
    for await (const chunk of result.textStream) {
      report += chunk;
    }

    return jsonResponse({
      success: true,
      report: report.trim(),
    });
  } catch (error) {
    console.error('[worker] review agent failed', error);
    return jsonResponse({ error: '代码评审失败，请稍后再试。' }, 500);
  }
}

function buildPrompt(payload: ReviewRequest): string {
  const sections = [
    REVIEW_PREFIX,
    payload.context ? `背景信息：${payload.context}` : null,
    payload.framework ? `框架/技术栈：${payload.framework}` : null,
    payload.filename ? `文件名：${payload.filename}` : null,
    `代码：\n\`\`\`\n${payload.code?.trim()}\n\`\`\``,
    '请至少给出三条问题，并提供修复建议与严重程度。',
  ].filter(Boolean);

  return sections.join('\n\n');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(JSON_HEADERS),
  });
}

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization',
    ...extra,
  };
}
