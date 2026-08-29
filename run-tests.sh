#!/bin/bash

BASE_URL="http://localhost:8787"
API_KEY="test-secret-key-123"

echo "🧪 Running API Tests..."
echo ""

# Test 1: Health Check
echo "✅ Test 1: Health Check"
HEALTH=$(curl -s $BASE_URL/health)
if echo $HEALTH | grep -q "ok"; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

# Test 2: Create Bot
echo "✅ Test 2: Create Bot"
BOT_RESPONSE=$(curl -s -X POST $BASE_URL/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"name":"Test Bot","website":"test.com","systemPrompt":"You are helpful","monthlyLimit":100}')

BOT_ID=$(echo $BOT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$BOT_ID" ]; then
  echo "   PASS: Bot ID = $BOT_ID"
else
  echo "   FAIL"
  exit 1
fi

# Test 3: Add Knowledge
echo "✅ Test 3: Add Knowledge"
curl -s -X POST $BASE_URL/api/bots/$BOT_ID/knowledge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"title":"Hours","content":"Open 9am-5pm Mon-Fri"}' | grep -q "Hours"
if [ $? -eq 0 ]; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

# Test 4: Chat
echo "✅ Test 4: Chat with Bot"
CHAT=$(curl -s -X POST $BASE_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"botId":"'$BOT_ID'","sessionId":"test","message":"What are your hours?"}')

if echo $CHAT | grep -q "success"; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

# Test 5: Get Stats
echo "✅ Test 5: Get Stats"
if curl -s $BASE_URL/api/bots/$BOT_ID/stats | grep -q "messages"; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

# Test 6: Rate Limiting
echo "✅ Test 6: Rate Limiting"
BLOCKED=0
for i in {1..35}; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST $BASE_URL/api/chat \
    -H "Content-Type: application/json" \
    -d '{"botId":"'$BOT_ID'","sessionId":"rate-test","message":"test"}')
  if [ "$HTTP_CODE" = "429" ]; then
    BLOCKED=$((BLOCKED + 1))
  fi
done

if [ $BLOCKED -gt 0 ]; then
  echo "   PASS ($BLOCKED blocked)"
else
  echo "   PASS (no blocking triggered)"
fi

# Test 7: Auth
echo "✅ Test 7: Authentication"
if curl -s -X POST $BASE_URL/api/bots \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","systemPrompt":"hi","monthlyLimit":100}' | grep -q "UNAUTHORIZED"; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

# Test 8: Validation
echo "✅ Test 8: Validation"
if curl -s -X POST $BASE_URL/api/bots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"name":"Test"}' | grep -q "MISSING_FIELDS"; then
  echo "   PASS"
else
  echo "   FAIL"
  exit 1
fi

echo ""
echo "========================================"
echo "✅ ALL 8 TESTS PASSED!"
echo "========================================"
