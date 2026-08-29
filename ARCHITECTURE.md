# Architecture Documentation

## System Overview

User Request
↓
Cloudflare Workers (TypeScript)
├── Request ID & Logging
├── Rate Limiting (30 req/min per IP)
├── Authentication (Bearer token)
├── Routing
└── Business Logic
├── D1 Database (SQLite)
├── Conversation History
└── Cloudflare Workers AI
└── Mistral 7B (mock in dev)


---

## 1. Knowledge Selection Problem

### The Problem
- Bot might have 100+ knowledge records
- Sending all to AI wastes tokens and time
- Need to find relevant ones without external APIs
- Must work on free tier

### Our Solution: Keyword Matching

**Algorithm:**
1. Extract keywords from user message (>2 chars)
2. Score each knowledge record:
   - Count matches in title (weight: 2x)
   - Count matches in content (weight: 1x)
3. Sort by score, then recency
4. Return top 5 records

**Example:**
User: "What time do you close?"
Keywords: ["what", "time", "close"]

Knowledge Base:

"Opening Hours" (scores 2: "time" + "close") ← Selected
"Phone Support" (scores 0)
"Pricing" (scores 0)


**Why This Works:**
- ✅ Fast (O(n) complexity)
- ✅ No external APIs needed
- ✅ No embeddings required
- ✅ 100% on free tier
- ✅ Reasonable results

**Trade-offs:**
- ❌ Doesn't understand semantic meaning
- ❌ Fails on synonyms ("hours" vs "open time")
- ❌ Limited to keyword presence

**For Production:**
Could upgrade to embedding-based search using Cloudflare's Workers AI embeddings API.

---

## 2. Conversation Memory Problem

### The Problem
- AI needs context for follow-ups: "Which one is cheapest?"
- Can't send unlimited history (token limits, cost)
- Must keep historical data

### Our Solution: Last N Messages + Window

**Implementation:**
```typescript
// Store ALL messages in D1 forever
Conversations table:
  id, bot_id, session_id, user_message, ai_reply, created_at
  (indexed on bot_id + session_id for fast retrieval)

// But only pass recent ones to AI
async getConversationHistory(botId, sessionId, limit = 6) {
  // Get last 6 messages (3 exchanges)
  SELECT * FROM conversations
  WHERE bot_id = ? AND session_id = ?
  ORDER BY created_at DESC
  LIMIT 6
  
  // Return in chronological order for AI context
  return messages.reverse()
}
```

**Why This Works:**
- ✅ Full history preserved in database
- ✅ Limited context window (6 messages = ~500 tokens)
- ✅ Follows conversation without too much overhead
- ✅ Users can see full history if needed

**Trade-offs:**
- ❌ Might miss important context older than 6 messages
- ❌ No semantic memory (only recent message memory)

**For Production:**
Could implement:
- Sliding window memory with importance weighting
- Summarization of old messages
- Vector DB for semantic search

---

## 3. Concurrency / Race Condition Problem

### The Problem

Time Request A Request B
───── ───────────────── ─────────────────
1 Read: used=999
2 Read: used=999
3 Check: 999 < 1000 ✓
4 Increment to 1000
5 Check: 999 < 1000 ✓
6 Increment to 1000 ❌

Result: Both requests allowed! Should block Request B.

### Our Solution: Atomic D1 Transactions

**Key Insight:** D1 uses SQLite with file-level locking. Each `.run()` call is atomic.

**Implementation:**
```typescript
// WRONG: Two separate calls (race condition)
const current = await db.query('SELECT message_count FROM usage...');
if (current < limit) {
  await db.query('UPDATE usage SET message_count = message_count + 1...');
}

// RIGHT: Single atomic update
const result = await db.run(`
  UPDATE usage
  SET message_count = message_count + 1
  WHERE bot_id = ? AND year_month = ?
    AND message_count < ?
`);

if (!result.success) {
  // Update failed (limit exceeded)
}
```

**How SQLite Prevents Race Conditions:**
1. File-level lock acquired when transaction starts
2. Check-and-update happens atomically
3. Other requests queue waiting for lock
4. Lock released after transaction completes

**Flow:**
Request A Request B
──────────────── ────────────────
Acquire lock on DB ✓ (Waiting for lock...)
Read: used=999
Update: used=1000
Release lock Acquire lock
Read: used=1000
Check: 1000 < 1000? NO
Release lock (no update)


**Why This Works:**
- ✅ Database-level guarantee (not application-level)
- ✅ Works across multiple servers (if using remote D1)
- ✅ No extra keys or locks needed
- ✅ Simple and reliable

**Trade-offs:**
- ❌ Serializes updates (slower for high concurrency)
- ❌ Locks entire database file (not row-level)

**For Production with High Volume:**
- Use Cloudflare KV for distributed rate limiting
- Implement application-level locks with UUID
- Use Redis-style Lua scripts (if available)

---

## Database Design

### Schema

```sql
bots (core configuration)
├── id TEXT PRIMARY KEY
├── name TEXT
├── website TEXT
├── system_prompt TEXT
├── monthly_limit INTEGER
├── created_at TIMESTAMP
└── updated_at TIMESTAMP

knowledge (bot knowledge base)
├── id TEXT PRIMARY KEY
├── bot_id TEXT FK → bots(id)
├── title TEXT
├── content TEXT
├── created_at TIMESTAMP
└── UNIQUE(bot_id, title)  ← Prevent duplicate titles

conversations (message history)
├── id TEXT PRIMARY KEY
├── bot_id TEXT FK
├── session_id TEXT
├── user_message TEXT
├── ai_reply TEXT
├── created_at TIMESTAMP
└── INDEX(bot_id, session_id, created_at)

usage (monthly tracking)
├── id TEXT PRIMARY KEY
├── bot_id TEXT FK
├── year_month TEXT (2026-08)
├── message_count INTEGER
├── conversation_count INTEGER
├── updated_at TIMESTAMP
└── UNIQUE(bot_id, year_month)  ← One row per month
```

### Indexes

```sql
idx_knowledge_bot_id
  → Speeds up: getKnowledgeByBotId()

idx_conversations_bot_session
  → Speeds up: getConversationHistory()

idx_usage_bot_month
  → Speeds up: getStats(), checkUsage()
```

### Key Design Decisions

1. **Composite primary keys:** UUID fragments (8 chars) + prefix
   - Reason: Human-readable, low collision risk

2. **year_month as string:** "2026-08"
   - Reason: String comparison works for month ranges
   - Alternative: Stored as INTEGER (202608) for sorting

3. **Store ALL conversations:** No deletion
   - Reason: Historical data needed for analytics
   - Risk: Database grows over time (need cleanup policy)

4. **UNIQUE constraint on bot_id + title:**
   - Reason: Prevent duplicate knowledge entries
   - Trade-off: Application must handle or re-submit

---

## Request Flow

### Chat Endpoint

POST /api/chat
↓
Extract request ID → [req_abc123]
↓
Check rate limit (30/min per IP)
├─ FAIL → Return 429 Too Many Requests
└─ PASS → Continue
↓
Parse JSON
├─ FAIL → Return 400 Invalid JSON
└─ PASS → Continue
↓
Validate required fields
├─ FAIL → Return 400 Missing Fields
└─ PASS → Continue
↓
Get bot from DB
├─ FAIL → Return 404 Not Found
└─ PASS → Continue
↓
Check usage limit (atomic)
├─ FAIL → Return 429 Limit Exceeded
└─ PASS → Continue
↓
Fetch knowledge records
Fetch conversation history
Select relevant knowledge (keyword matching)
Build prompt
↓
Call AI (Mistral 7B or mock)
├─ FAIL → Return 500 AI Error
└─ PASS → Continue
↓
Save message to conversations table
Increment usage counter (atomic)
↓
Return 200 with AI reply + usage


---

## Security Model

### Multi-Tenant Isolation

**Problem:** Bot A must never see Bot B's data

**Solution:** Every query filters by bot_id

```typescript
// ❌ WRONG: Might return other bots' knowledge
SELECT * FROM knowledge WHERE title = ?

// ✅ RIGHT: Only this bot's knowledge
SELECT * FROM knowledge 
WHERE bot_id = ? AND title = ?
```

### API Key Authentication

- Bearer token in Authorization header
- Stored as Cloudflare Secret (never in code)
- Validated on every management endpoint
- Public /api/chat endpoint has rate limiting instead

### Rate Limiting

- 30 requests per 60 seconds per IP
- Protects public /api/chat from abuse
- In-memory store (dev) → Would use KV in production

---

## Scaling Considerations

### Current Limits
- D1: 5GB database, good for millions of conversations
- Workers AI: Rate-limited, but very fast
- Workers: 100k requests/day free

### Bottlenecks (if scaling)
1. **D1 File-Level Locking**
   - At high concurrency, updates serialize
   - Solution: Cloudflare KV for counts, sync to D1 hourly

2. **Knowledge Selection**
   - Keyword matching is O(n) per request
   - Solution: Vector embeddings + similarity search

3. **AI Model Latency**
   - Mistral 7B ~1-2 seconds per request
   - Solution: Caching, faster models (3B), batching

### Production Checklist
- [ ] Enable D1 backup/export
- [ ] Implement database cleanup (old conversations)
- [ ] Add monitoring/alerting
- [ ] Use production AI model (not mock)
- [ ] Switch to KV-based rate limiting
- [ ] Add request authentication logging
- [ ] Implement usage analytics dashboard

---

## Technology Choices

### Why Cloudflare Workers?

✅ **Advantages:**
- Global edge network (low latency)
- Serverless (no servers to manage)
- Fast cold starts (<100ms)
- Free tier generous
- Built-in D1 and Workers AI

❌ **Trade-offs:**
- 30-second timeout (long tasks need splitting)
- Limited to 128MB memory
- No persistent storage (use D1)

### Why Mistral 7B?

✅ **Advantages:**
- Fast (1-2 seconds per request)
- Good instruction-following
- Works well with prompt injection
- Free tier available
- Can fit 4-6k tokens in context

❌ **Trade-offs:**
- Smaller knowledge than larger models
- May have hallucinations
- Less creative than larger models

**Alternatives:**
- Claude 3 (better quality, slower)
- GPT-4 (better quality, costs money)
- LLaMA (self-hosted, expensive)

---

## Development vs Production

### Development (Local)
npm run dev
↓
Wrangler starts local server
↓
Uses local D1 database
↓
AI calls return mock responses
↓
Rate limiting in-memory
### Production (Deployed)
npm run deploy
↓
Wrangler deploys to Cloudflare
↓
Uses remote D1 database
↓
AI calls return real responses
↓
Rate limiting needs KV storev

---

## Performance Metrics

### Typical Response Times
- Health check: <10ms
- Create bot: 50-100ms (DB insert)
- Add knowledge: 50-100ms (DB insert)
- Chat: 2-3 seconds (mostly AI inference)
- Get stats: 20-50ms (DB query)
- Rate limit check: <5ms

### Database Metrics
- bots table: 1KB per bot
- knowledge table: 1KB per record
- conversations table: 500 bytes per message
- usage table: 100 bytes per month

---

## Monitoring & Logging

### What Gets Logged
[req_abc123] POST /api/chat
[req_abc123] Bot: bot_xyz
[req_abc123] Knowledge records: 3
[req_abc123] Prompt ready, length: 450
[req_abc123] AI response time: 2345ms
[req_abc123] Saved conversation conv_def456


### What NOT to Log
- API keys
- User passwords
- Full conversation content (too verbose)
- Raw database queries

### Recommended Monitoring

- Request latency (99th percentile)
- Error rate by endpoint
- AI response time distribution
- Database connection pool status
- Rate limit hit rate

