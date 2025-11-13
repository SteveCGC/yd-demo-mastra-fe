import { mastra } from '../mastra';

const weatherAgent = mastra.getAgent('weatherAgent');

type AgentMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type AgentRequestPayload = {
  messages?: AgentMessage[];
  prompt?: string;
  city?: string;
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    console.log('[worker] received request', url.pathname);
    if (request.method === 'POST' && url.pathname === '/api/agents/weatherAgent/generate') {
      return handleWeatherRequest(request);
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

async function handleWeatherRequest(request: Request): Promise<Response> {
  let payload: AgentRequestPayload | undefined;

  try {
    payload = (await request.json()) as AgentRequestPayload;
  } catch {
    return jsonResponse({ error: '请求体必须是合法的 JSON' }, 400);
  }
  console.log('[worker] weather agent payload', payload);
  const messages = normalizeMessages(payload);
  console.log('[worker] normalized messages', messages);
  if (!messages) {
    return jsonResponse(
      {
        error:
          '请提供 messages 数组，或者指定 prompt/city 字段来描述查询内容。',
      },
      400,
    );
  }

  try {
    const result = await weatherAgent.stream(messages);
    let text = '';

    for await (const chunk of result.textStream) {
      text += chunk;
    }

    return jsonResponse({
      success: true,
      text: text.trim(),
    });
  } catch (error) {
    console.error('[worker] weather agent failed', error);
    return jsonResponse({ error: 'Weather agent 执行失败' }, 500);
  }
}

function normalizeMessages(
  payload: AgentRequestPayload | undefined,
): AgentMessage[] | null {
  if (!payload) return null;
  if (
    Array.isArray(payload.messages) &&
    payload.messages.length > 0 &&
    payload.messages.every(
      (msg) =>
        typeof msg === 'object' &&
        typeof (msg as AgentMessage).role === 'string' &&
        typeof (msg as AgentMessage).content === 'string',
    )
  ) {
    return payload.messages as AgentMessage[];
  }

  const basePrompt =
    typeof payload.prompt === 'string' && payload.prompt.trim()
      ? payload.prompt.trim()
      : payload.city
        ? `请根据 ${payload.city} 的天气情况提供详细的活动建议。`
        : null;

  if (!basePrompt) {
    return null;
  }

  return [
    {
      role: 'user',
      content: basePrompt,
    },
  ];
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(JSON_HEADERS),
  });
}

function corsHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization',
    ...extra,
  };
}
