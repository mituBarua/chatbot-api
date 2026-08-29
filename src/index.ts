import { DatabaseQueries } from './db/queries';
import { requireAuth, sendError, sendSuccess } from './middleware/auth';
import { AddKnowledgeRequest, ChatRequest, CreateBotRequest } from './types';


interface Env {
  DB: D1Database;
  API_KEY: string;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    try {
      // Health check
      if (path === '/health' && method === 'GET') {
        return sendSuccess({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // Create bot
      if (path === '/api/bots' && method === 'POST') {
        return handleCreateBot(request, env);
      }

      // Add knowledge
      if (path.match(/^\/api\/bots\/[^/]+\/knowledge$/) && method === 'POST') {
        const botId = path.split('/')[3];
        return handleAddKnowledge(request, env, botId);
      }

      // Chat
      if (path === '/api/chat' && method === 'POST') {
        return handleChat(request, env);
      }

      // Stats
      if (path.match(/^\/api\/bots\/[^/]+\/stats$/) && method === 'GET') {
        const botId = path.split('/')[3];
        return handleGetStats(request, env, botId);
      }

      // 404
      return sendError('NOT_FOUND', 'Endpoint not found', 404);
    } catch (error) {
      console.error('Unhandled error:', error);
      return sendError('INTERNAL_ERROR', 'Internal server error', 500);
    }
  }
};

// ========== HANDLERS ==========

async function handleCreateBot(request: Request, env: Env): Promise<Response> {
  try {
    const apiKey = await requireAuth(request, env);
    if (!apiKey) {
      return sendError('UNAUTHORIZED', 'Missing or invalid API key', 401);
    }

    let data: CreateBotRequest;
    try {
      data = await request.json();
    } catch {
      return sendError('INVALID_JSON', 'Request body must be valid JSON', 400);
    }

    if (!data.name || !data.systemPrompt || !data.monthlyLimit) {
      return sendError(
        'MISSING_FIELDS',
        'Required fields: name, systemPrompt, monthlyLimit',
        400
      );
    }

    if (typeof data.monthlyLimit !== 'number' || data.monthlyLimit <= 0) {
      return sendError('INVALID_LIMIT', 'monthlyLimit must be a positive number', 400);
    }

    const botId = `bot_${crypto.randomUUID().split('-')[0]}`;
    const db = new DatabaseQueries(env.DB);
    const bot = await db.createBot(botId, data);

    return sendSuccess({ success: true, bot }, 201);
  } catch (error) {
    console.error('Error creating bot:', error);
    return sendError('INTERNAL_ERROR', 'Failed to create bot', 500);
  }
}

async function handleAddKnowledge(
  request: Request,
  env: Env,
  botId: string
): Promise<Response> {
  try {
    const apiKey = await requireAuth(request, env);
    if (!apiKey) {
      return sendError('UNAUTHORIZED', 'Missing or invalid API key', 401);
    }

    let data: AddKnowledgeRequest;
    try {
      data = await request.json();
    } catch {
      return sendError('INVALID_JSON', 'Request body must be valid JSON', 400);
    }

    if (!data.title || !data.content) {
      return sendError('MISSING_FIELDS', 'Required fields: title, content', 400);
    }

    if (data.title.length > 255 || data.content.length > 10000) {
      return sendError(
        'FIELD_TOO_LONG',
        'title max 255 chars, content max 10000 chars',
        400
      );
    }

    const db = new DatabaseQueries(env.DB);
    const bot = await db.getBotById(botId);
    if (!bot) {
      return sendError('BOT_NOT_FOUND', 'The chatbot does not exist', 404);
    }

    const knowledgeId = `knowledge_${crypto.randomUUID().split('-')[0]}`;
    const knowledge = await db.addKnowledge(knowledgeId, botId, data.title, data.content);

    return sendSuccess({ success: true, knowledge }, 201);
  } catch (error: any) {
    console.error('Error adding knowledge:', error);

    if (error.message?.includes('UNIQUE constraint failed')) {
      return sendError(
        'DUPLICATE_TITLE',
        'A knowledge record with this title already exists for this bot',
        400
      );
    }

    return sendError('INTERNAL_ERROR', 'Failed to add knowledge', 500);
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  try {
    let data: ChatRequest;
    try {
      data = await request.json();
    } catch {
      return sendError('INVALID_JSON', 'Request body must be valid JSON', 400);
    }

    if (!data.botId || !data.sessionId || !data.message) {
      return sendError(
        'MISSING_FIELDS',
        'Required fields: botId, sessionId, message',
        400
      );
    }

    if (data.message.length === 0 || data.message.length > 5000) {
      return sendError(
        'MESSAGE_TOO_LONG',
        'Message must be between 1 and 5000 characters',
        400
      );
    }

    const db = new DatabaseQueries(env.DB);
    const bot = await db.getBotById(data.botId);
    if (!bot) {
      return sendError('BOT_NOT_FOUND', 'The chatbot does not exist', 404);
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    const usage = await db.getOrCreateUsage(data.botId, yearMonth);
    const remaining = bot.monthlyLimit - usage.messageCount;

    if (remaining <= 0) {
      return sendError(
        'LIMIT_EXCEEDED',
        'This bot has reached its monthly message limit',
        429
      );
    }

    // TODO: Implement AI call
    const aiReply = '[AI response will be generated here]';

    const conversationId = `conv_${crypto.randomUUID().split('-')[0]}`;
    await db.saveConversation(
      conversationId,
      data.botId,
      data.sessionId,
      data.message,
      aiReply
    );

    await db.incrementMessageCount(data.botId, yearMonth);

    return sendSuccess({
      success: true,
      reply: aiReply,
      usage: {
        used: usage.messageCount + 1,
        limit: bot.monthlyLimit,
        remaining: remaining - 1
      }
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return sendError('INTERNAL_ERROR', 'Failed to process chat message', 500);
  }
}

async function handleGetStats(
  request: Request,
  env: Env,
  botId: string
): Promise<Response> {
  try {
    const db = new DatabaseQueries(env.DB);
    const bot = await db.getBotById(botId);
    if (!bot) {
      return sendError('BOT_NOT_FOUND', 'The chatbot does not exist', 404);
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    const stats = await db.getStats(botId, yearMonth);

    if (!stats) {
      return sendSuccess({
        botId,
        month: yearMonth,
        messages: 0,
        conversations: 0,
        remaining: bot.monthlyLimit
      });
    }

    return sendSuccess({
      botId,
      month: yearMonth,
      messages: stats.messageCount,
      conversations: stats.conversationCount,
      remaining: bot.monthlyLimit - stats.messageCount
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return sendError('INTERNAL_ERROR', 'Failed to get stats', 500);
  }
}