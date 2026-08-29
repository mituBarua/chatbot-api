# Cloudflare AI Chatbot API

A production-quality chatbot API built entirely on Cloudflare's free services.

## Features

- ✅ Create and manage multiple chatbots
- ✅ Add knowledge base records to each bot
- ✅ Chat with bots using Cloudflare Workers AI
- ✅ Monthly usage tracking and limits
- ✅ Conversation history and context awareness
- ✅ Smart knowledge selection (keyword matching)
- ✅ Secure API key authentication
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
# 1. Clone repository
git clone <repo-url>
cd cloudflare-chatbot-api

# 2. Install dependencies
npm install

# 3. Create D1 database
npx wrangler d1 create chatbot_db

# 4. Update wrangler.toml with your database ID

# 5. Apply database schema
npx wrangler d1 execute chatbot_db --file=src/db/schema.sql

# 6. Set API key
npx wrangler secret put API_KEY
# Enter: your-secret-key-123

# 7. Start development server
npm run dev
```

## API Endpoints

### 1. Health Check
```bash
GET /health
```
Response:
```json
{"status":"ok","timestamp":"2026-08-29T..."}
```

### 2. Create Bot
```bash
POST /api/bots
Authorization: Bearer YOUR_API_KEY

{
  "name": "Support Bot",
  "website": "example.com",
  "systemPrompt": "You are a helpful customer support assistant.",
  "monthlyLimit": 1000
}
```
Response:
```json
{
  "success": true,
  "bot": {
    "id": "bot_abc123",
    "name": "Support Bot",
    "website": "example.com",
    "systemPrompt": "You are a helpful customer support assistant.",
    "monthlyLimit": 1000,
    "createdAt": "2026-08-29T...",
    "updatedAt": "2026-08-29T..."
  }
}
```

### 3. Add Knowledge
```bash
POST /api/bots/:botId/knowledge
Authorization: Bearer YOUR_API_KEY

{
  "title": "Opening Hours",
  "content": "We are open Monday to Friday from 8:30 AM until 5 PM."
}
```
Response:
```json
{
  "success": true,
  "knowledge": {
    "id": "knowledge_xyz",
    "botId": "bot_abc123",
    "title": "Opening Hours",
    "content": "We are open Monday to Friday from 8:30 AM until 5 PM.",
    "createdAt": "2026-08-29T..."
  }
}
```

### 4. Chat with Bot
```bash
POST /api/chat

{
  "botId": "bot_abc123",
  "sessionId": "session_user123",
  "message": "What time do you close?"
}
```
Response:
```json
{
  "success": true,
  "reply": "We close at 5 PM Monday to Friday.",
  "usage": {
    "used": 21,
    "limit": 1000,
    "remaining": 979
  }
}
```

### 5. Get Statistics
```bash
GET /api/bots/:botId/stats
```
Response:
```json
{
  "botId": "bot_abc123",
  "month": "2026-08",
  "messages": 421,
  "conversations": 83,
  "remaining": 579
}
```

## Architecture

The API uses a layered architecture:
Request → Middleware (Auth, RateLimit, RequestID)
↓
Router (index.ts)
↓
Handler Functions (handleChat, handleCreateBot, etc.)
↓
Database Layer (queries.ts)
↓
AI Service (ai-service.ts)
↓
Cloudflare Workers AI / Mock Response


### Key Design Decisions

1. **Knowledge Selection**: Uses keyword matching instead of embeddings to stay on free tier
2. **Conversation Memory**: Stores all messages in D1, passes last 6 to AI for context
3. **Race Condition Prevention**: Atomic D1 transactions prevent double-counting
4. **Authentication**: API keys stored as Cloudflare Secrets, never in code
5. **Rate Limiting**: 30 requests/minute per IP on public /api/chat endpoint

## Database Schema

### Tables

- **bots** - Chatbot configurations
- **knowledge** - Knowledge base records
- **conversations** - Chat message history
- **usage** - Monthly usage tracking

See `ARCHITECTURE.md` for complete schema details.

## Testing

### Automated Tests
```bash
bash run-tests.sh
```

Runs 8 comprehensive tests:
1. Health endpoint
2. Bot creation
3. Knowledge addition
4. Chat functionality
5. Statistics retrieval
6. Rate limiting
7. Authentication
8. Field validation

### Manual Testing (Postman)
Import `Chatbot-API.postman_collection.json` in Postman with variables:
- `base_url`: http://localhost:8787
- `api_key`: test-secret-key-123
- `bot_id`: (fill after creating bot)

### Quick Manual Test
```bash
npm run dev
# In another terminal:
./test-api.sh
```

## Deployment

```bash
# Build
npm run build

# Deploy to Cloudflare
npm run deploy
```

This deploys to your Cloudflare Workers account.

## Project Structure

src/

├── index.ts # Main handler
├── types/index.ts # TypeScript types
├── db/
│ ├── schema.sql # Database schema
│ └── queries.ts # Database operations
├── middleware/
│ ├── auth.ts # Authentication
│ ├── request-id.ts # Request tracking
│ └── rate-limit.ts # Rate limiting
└── utils/
├── knowledge-selector.ts # Keyword matching
├── prompt-builder.ts # Prompt construction
└── ai-service.ts # AI integration
wrangler.toml # Cloudflare config
package.json # Dependencies
README.md # This file
ARCHITECTURE.md # Detailed architecture


## Free Tier Limits

- **D1**: 5GB database (plenty for millions of conversations)
- **Workers**: 100k requests/day (more than enough)
- **Workers AI**: Free tier available
- **Total Cost**: $0/month ✅

## Documentation

- `README.md` - Setup and API reference (this file)
- `ARCHITECTURE.md` - Detailed architecture, design decisions, and explanations
- `Chatbot-API.postman_collection.json` - Postman API collection
- `run-tests.sh` - Automated test script
- `test-api.sh` - Manual test script with curl examples

## License

MIT

## Support

For issues or questions, check:
1. Setup instructions above
2. ARCHITECTURE.md for design details
3. Test scripts for example usage
4. API endpoints documentation above
