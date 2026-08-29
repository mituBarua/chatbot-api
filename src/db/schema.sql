-- bots table
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  system_prompt TEXT NOT NULL,
  monthly_limit INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- knowledge base
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  UNIQUE(bot_id, title)
);

-- conversation history
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_reply TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- usage tracking (monthly)
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  conversation_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  UNIQUE(bot_id, year_month)
);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_bot_id ON knowledge(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot_session ON conversations(bot_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_bot_month ON usage(bot_id, year_month);