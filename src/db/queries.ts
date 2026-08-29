import { Bot, Knowledge, Conversation, Usage } from '../types';

export class DatabaseQueries {
  constructor(private db: D1Database) {}

  // ========== BOTS ==========

  async createBot(id: string, data: any): Promise<Bot> {
    const result = await this.db
      .prepare(
        `INSERT INTO bots (id, name, website, system_prompt, monthly_limit)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, data.name, data.website || null, data.systemPrompt, data.monthlyLimit)
      .run();

    if (!result.success) {
      throw new Error('Failed to create bot');
    }

    return this.getBotById(id) as Promise<Bot>;
  }

  async getBotById(botId: string): Promise<Bot | null> {
    const result = await this.db
      .prepare('SELECT * FROM bots WHERE id = ?')
      .bind(botId)
      .first<Bot>();

    return result || null;
  }

  // ========== KNOWLEDGE ==========

  async addKnowledge(id: string, botId: string, title: string, content: string): Promise<Knowledge> {
    const result = await this.db
      .prepare(
        `INSERT INTO knowledge (id, bot_id, title, content)
         VALUES (?, ?, ?, ?)`
      )
      .bind(id, botId, title, content)
      .run();

    if (!result.success) {
      throw new Error('Failed to add knowledge');
    }

    return { id, botId, title, content, createdAt: new Date().toISOString() };
  }

  async getKnowledgeByBotId(botId: string): Promise<Knowledge[]> {
    const results = await this.db
      .prepare('SELECT id, bot_id as botId, title, content, created_at as createdAt FROM knowledge WHERE bot_id = ?')
      .bind(botId)
      .all<Knowledge>();

    return results.results || [];
  }

  // ========== CONVERSATIONS ==========

  async saveConversation(
    id: string,
    botId: string,
    sessionId: string,
    userMessage: string,
    aiReply: string
  ): Promise<Conversation> {
    const result = await this.db
      .prepare(
        `INSERT INTO conversations (id, bot_id, session_id, user_message, ai_reply)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, botId, sessionId, userMessage, aiReply)
      .run();

    if (!result.success) {
      throw new Error('Failed to save conversation');
    }

    return {
      id,
      botId,
      sessionId,
      userMessage,
      aiReply,
      createdAt: new Date().toISOString()
    };
  }

  async getConversationHistory(botId: string, sessionId: string, limit: number = 6): Promise<Conversation[]> {
    const results = await this.db
      .prepare(
        `SELECT id, bot_id as botId, session_id as sessionId, user_message as userMessage, ai_reply as aiReply, created_at as createdAt
         FROM conversations
         WHERE bot_id = ? AND session_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(botId, sessionId, limit)
      .all<Conversation>();

    return (results.results || []).reverse(); // Chronological order
  }

  // ========== USAGE ==========

  async getOrCreateUsage(botId: string, yearMonth: string): Promise<Usage> {
    let usage = await this.db
      .prepare('SELECT * FROM usage WHERE bot_id = ? AND year_month = ?')
      .bind(botId, yearMonth)
      .first<Usage>();

    if (!usage) {
      const id = `usage_${botId}_${yearMonth}`;
      await this.db
        .prepare(
          `INSERT INTO usage (id, bot_id, year_month, message_count, conversation_count)
           VALUES (?, ?, ?, 0, 0)`
        )
        .bind(id, botId, yearMonth)
        .run();

      usage = {
        botId,
        yearMonth,
        messageCount: 0,
        conversationCount: 0,
        updatedAt: new Date().toISOString()
      };
    }

    return usage;
  }

  async incrementMessageCount(botId: string, yearMonth: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE usage
         SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE bot_id = ? AND year_month = ?`
      )
      .bind(botId, yearMonth)
      .run();
  }

  async getStats(botId: string, yearMonth: string): Promise<Usage | null> {
    return this.db
      .prepare('SELECT * FROM usage WHERE bot_id = ? AND year_month = ?')
      .bind(botId, yearMonth)
      .first<Usage>();
  }
}