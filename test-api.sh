
#!/bin/bash

BASE_URL="http://localhost:8787"
API_KEY="test-secret-key-123"

echo "🔍 Testing Chatbot API..."
echo ""

# Health check
echo "1️⃣  Health Check"
curl -s $BASE_URL/health | jq .
echo ""

# Create bot
echo "2️⃣  Create Bot"
BOT_RESPONSE=$(curl -s -X POST $BASE_URL/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "name": "Test Bot",
    "website": "test.example.com",
    "systemPrompt": "You are a helpful assistant",
    "monthlyLimit": 100
  }')
echo $BOT_RESPONSE | jq .
BOT_ID=$(echo $BOT_RESPONSE | jq -r '.bot.id')
echo "Bot ID: $BOT_ID"
echo ""

# Add knowledge
echo "3️⃣  Add Knowledge"
curl -s -X POST $BASE_URL/api/bots/$BOT_ID/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "title": "Hours",
    "content": "We are open Monday-Friday 9am-5pm"
  }' | jq .
echo ""

# Chat
echo "4️⃣  Chat with Bot"
curl -s -X POST $BASE_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "'$BOT_ID'",
    "sessionId": "test-session",
    "message": "What are your hours?"
  }' | jq .
echo ""

# Stats
echo "5️⃣  Get Stats"
curl -s $BASE_URL/api/bots/$BOT_ID/stats | jq .
echo ""
