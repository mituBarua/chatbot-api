import { Bot, Knowledge, Conversation, Usage } from '../types';

export class DatabaseQueries {
  constructor(private db: D1Database) {}

  private mapBotRow(row: any): Bot {
    return {
      id: row.id,
      name: row.name,
      website: row.website,
      systemPrompt: row.system_prompt,
      monthlyLimit: row.monthly_limit,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapKnowledgeRow(row: any): Knowledge {
    return {
      id: row.id,
      botId: row.bot_id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at
    };
  }

  private mapConversationRow(row: any): Conversation {
    return {
      id: row.id,
      botId: row.bot_id,
      sessionId: row.session_id,
      userMessage: row.user_message,
      aiReply: row.ai_reply,
      createdAt: row.created_at
    };
  }

  private mapUsageRow(row: any): Usage {
    return {
      botId: row.bot_id,
      yearMonth: row.year_month,
      messageCount: row.message_count,
      conversationCount: row.conversation_count,
      updatedAt: row.updated_at
    };
  }

  // ========== BOTS ==========

  async createBot(id: string, data: any): Promise<Bot> {
    await this.db
      .prepare(
        `INSERT INTO bots (id, name, website, system_prompt, monthly_limit)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, data.name, data.website || null, data.systemPrompt, data.monthlyLimit)
      .run();

    const result = await this.db
      .prepare('SELECT * FROM bots WHERE id = ?')
      .bind(id)
      .first();

    return this.mapBotRow(result);
  }

  async getBotById(botId: string): Promise<Bot | null> {
    const result = await this.db
      .prepare('SELECT * FROM bots WHERE id = ?')
      .bind(botId)
      .first();

    return result ? this.mapBotRow(result) : null;
  }

  // ========== KNOWLEDGE ==========

  async addKnowledge(id: string, botId: string, title: string, content: string): Promise<Knowledge> {
    await this.db
      .prepare(
        `INSERT INTO knowledge (id, bot_id, title, content)
         VALUES (?, ?, ?, ?)`
      )
      .bind(id, botId, title, content)
      .run();

    const result = await this.db
      .prepare('SELECT * FROM knowledge WHERE id = ?')
      .bind(id)
      .first();

    return this.mapKnowledgeRow(result);
  }

  async getKnowledgeByBotId(botId: string): Promise<Knowledge[]> {
    const results = await this.db
      .prepare('SELECT * FROM knowledge WHERE bot_id = ? ORDER BY created_at DESC')
      .bind(botId)
      .all();

    return (results.results || []).map(row => this.mapKnowledgeRow(row));
  }

  // ========== CONVERSATIONS ==========

  async saveConversation(
    id: string,
    botId: string,
    sessionId: string,
    userMessage: string,
    aiReply: string
  ): Promise<Conversation> {
    await this.db
      .prepare(
        `INSERT INTO conversations (id, bot_id, session_id, user_message, ai_reply)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, botId, sessionId, userMessage, aiReply)
      .run();

    const result = await this.db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .bind(id)
      .first();

    return this.mapConversationRow(result);
  }

  async getConversationHistory(botId: string, sessionId: string, limit: number = 6): Promise<Conversation[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM conversations
         WHERE bot_id = ? AND session_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(botId, sessionId, limit)
      .all();

    return (results.results || [])
      .reverse() // Get chronological order
      .map(row => this.mapConversationRow(row));
  }

  // ========== USAGE ==========

  async getOrCreateUsage(botId: string, yearMonth: string): Promise<Usage> {
    let usage = await this.db
      .prepare('SELECT * FROM usage WHERE bot_id = ? AND year_month = ?')
      .bind(botId, yearMonth)
      .first();

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
        bot_id: botId,
        year_month: yearMonth,
        message_count: 0,
        conversation_count: 0,
        updated_at: new Date().toISOString()
      };
    }

    return this.mapUsageRow(usage);
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
    const result = await this.db
      .prepare('SELECT * FROM usage WHERE bot_id = ? AND year_month = ?')
      .bind(botId, yearMonth)
      .first();

    return result ? this.mapUsageRow(result) : null;
  }
}