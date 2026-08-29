
# Cloudflare AI Chatbot API

A production-quality chatbot API built entirely on Cloudflare's free services.

## Features

- ✅ Create and manage multiple chatbots
- ✅ Add knowledge base records to each bot
- ✅ Chat with bots using Cloudflare Workers AI
- ✅ Monthly usage tracking and limits
- ✅ Conversation history and context awareness
- ✅ Smart knowledge selection (keyword matching)
- ✅ Secure authentication with API keys
- ✅ Multi-bot isolation

## Tech Stack

- **Cloudflare Workers** - Serverless compute
- **Cloudflare D1** - SQLite database
- **Cloudflare Workers AI** - LLM inference (Mistral 7B)
- **TypeScript** - Type safety
- **Wrangler** - CLI & tooling

## Setup

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
git clone <repo-url>
cd cloudflare-chatbot-api
npm install
```

### Configuration

1. Create D1 database:
```bash
npx wrangler d1 create chatbot_db
```

2. Update `wrangler.toml` with your database ID

3. Apply schema:
```bash
npx wrangler d1 execute chatbot_db --file=src/db/schema.sql
```

4. Set API key:
```bash
npx wrangler secret put API_KEY
# Enter: your-secret-key-123
```

5. Start dev server:
```bash
npm run dev
```

## API Endpoints

### Create Bot
```bash
curl -X POST http://localhost:8787/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "name": "Support Bot",
    "website": "example.com",
    "systemPrompt": "You are a helpful assistant",
    "monthlyLimit": 1000
  }'
```

### Add Knowledge
```bash
curl -X POST http://localhost:8787/api/bots/bot_xxx/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "title": "Hours",
    "content": "Open 9am-5pm Mon-Fri"
  }'
```

### Chat
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "bot_xxx",
    "sessionId": "session_yyy",
    "message": "What are your hours?"
  }'
```

### Get Stats
```bash
curl http://localhost:8787/api/bots/bot_xxx/stats
```

## Architecture

### Knowledge Selection

Uses keyword matching instead of embeddings:
- Keywords extracted from user message
- Scored against knowledge records
- Title matches weighted 2x higher
- Limited to 5 top results

**Why:** Stays 100% on free tier, no external APIs needed

### Conversation Memory

- Stores full message history in D1
- Last 6 messages retrieved per session
- Passed to AI for context awareness
- Enables follow-up questions like "which one is cheapest?"

### Usage Limits

- Atomic D1 transactions prevent race conditions
- Monthly usage reset automatic (year-month key)
- Historical data preserved

### AI Model

- **Model:** Mistral 7B Instruct
- **Reason:** Fast, instruction-following, free tier friendly
- **Dev Mode:** Mock responses (no remote call)
- **Prod Mode:** Real Cloudflare Workers AI

## Deployment

```bash
# Build & test
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Project Structure
src/
├── index.ts # Main handler
├── types/ # TypeScript interfaces
├── db/
│ ├── schema.sql # D1 migration
│ └── queries.ts # Database operations
├── middleware/
│ └── auth.ts # API key validation
└── utils/
├── knowledge-selector.ts
├── prompt-builder.ts
└── ai-service.ts


## Environment

- `.env.local` - Development secrets (not committed)
- `wrangler.toml` - Configuration

## Testing

```bash
npm run dev
# In another terminal:
./test-api.sh  # See scripts section
```

## Free Tier Limits

- D1: 5GB database
- Workers: 100k requests/day
- Workers AI: Varies by model
- Total: No additional costs

## License

MIT
