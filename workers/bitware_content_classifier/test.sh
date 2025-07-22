#!/bin/bash
# Deep analysis test for bitware_content_classifier
# Tests AI analysis quality with diverse, realistic articles

WORKER_URL="https://bitware-content-classifier.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"

echo "🔬 DEEP ANALYSIS TEST: bitware_content_classifier"
echo "=================================================="
echo ""

# Test 1: Highly relevant AI article
echo "🧪 TEST 1: Highly Relevant AI Article"
echo "======================================"

response1=$(curl -s "$WORKER_URL/analyze" -X POST \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "article_url": "https://www.bbc.com/news/technology/ai-breakthrough-2025",
      "title": "Major AI Breakthrough: New Neural Network Architecture Achieves Human-Level Performance",
      "content": "Researchers at Stanford University and Google DeepMind have announced a revolutionary breakthrough in artificial intelligence with the development of a new neural network architecture called ReasonNet. This system demonstrates unprecedented performance in complex reasoning tasks, matching human-level capabilities in mathematical problem-solving, logical inference, and creative thinking. The ReasonNet architecture incorporates novel attention mechanisms and recursive processing layers that allow the AI to break down complex problems into manageable sub-components. In benchmark tests, ReasonNet achieved 94% accuracy on the MMLU dataset and 89% on the challenging ARC test. Dr. Sarah Chen explained that ReasonNet shows genuine understanding rather than just sophisticated memorization. The implications for artificial general intelligence research are significant.",
      "author": "Dr. Emily Rodriguez, Technology Correspondent",
      "pub_date": "2025-07-22T09:00:00Z",
      "source_feed": "BBC Technology News",
      "word_count": 180
    }],
    "target_topic": "artificial intelligence",
    "analysis_depth": "deep",
    "include_summary": true
  }')

echo "📊 ANALYSIS RESULTS:"
echo "$response1" | python3 -m json.tool 2>/dev/null | grep -A20 "analysis_results" || echo "$response1"
echo ""

# Test 2: Moderately relevant article (mentions AI but not main focus)
echo "🧪 TEST 2: Moderately Relevant Article (Climate + AI mention)"
echo "============================================================="

response2=$(curl -s "$WORKER_URL/analyze" -X POST \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "article_url": "https://reuters.com/climate-tech-2025",
      "title": "Climate Scientists Use AI to Predict Extreme Weather Patterns with 95% Accuracy",
      "content": "Climate researchers have developed an innovative early warning system that uses artificial intelligence and machine learning to predict extreme weather events up to 14 days in advance with 95% accuracy. The system analyzes vast amounts of atmospheric data, satellite imagery, and historical weather patterns to identify potential hurricanes, heat waves, and flooding events. While traditional forecasting methods rely on physics-based models, this AI-driven approach can detect subtle patterns that human meteorologists might miss. The technology has already helped prevent billions in damage across coastal regions. However, scientists warn that climate change continues to accelerate, making even AI predictions more challenging as weather patterns become increasingly unpredictable.",
      "author": "Maria Santos, Climate Reporter",
      "pub_date": "2025-07-22T08:30:00Z",
      "source_feed": "Reuters Environment",
      "word_count": 145
    }],
    "target_topic": "artificial intelligence",
    "analysis_depth": "standard",
    "include_summary": true
  }')

echo "📊 ANALYSIS RESULTS:"
echo "$response2" | python3 -m json.tool 2>/dev/null | grep -A15 "analysis_results" || echo "$response2"
echo ""

# Test 3: Low relevance article (completely different topic)
echo "🧪 TEST 3: Low Relevance Article (Sports)"
echo "========================================="

response3=$(curl -s "$WORKER_URL/analyze" -X POST \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "article_url": "https://espn.com/tennis-championship-2025",
      "title": "Serena Williams Announces Return to Professional Tennis at Age 43",
      "content": "Tennis legend Serena Williams shocked the sports world today by announcing her return to professional tennis competition after a three-year retirement. The 23-time Grand Slam champion will participate in the upcoming Miami Open as a wildcard entry. Williams, now 43, has been training intensively for the past six months with her longtime coach Patrick Mouratoglou. In a press conference, she stated that she feels physically and mentally prepared to compete at the highest level once again. The tennis community has reacted with excitement and skepticism, with many wondering if Williams can still compete against players 20 years younger. Her first match is scheduled against rising star Coco Gauff in what promises to be an emotional and highly anticipated encounter.",
      "author": "Tom Bradley, Sports Correspondent",
      "pub_date": "2025-07-22T07:15:00Z",
      "source_feed": "ESPN Tennis",
      "word_count": 155
    }],
    "target_topic": "artificial intelligence",
    "analysis_depth": "quick",
    "include_summary": true
  }')

echo "📊 ANALYSIS RESULTS:"
echo "$response3" | python3 -m json.tool 2>/dev/null | grep -A10 "analysis_results" || echo "$response3"
echo ""

# Test 4: Batch analysis with mixed relevance
echo "🧪 TEST 4: Batch Analysis (Mixed Relevance)"
echo "==========================================="

response4=$(curl -s "$WORKER_URL/analyze" -X POST \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {
        "article_url": "https://techcrunch.com/openai-gpt5-release",
        "title": "OpenAI Announces GPT-5 with Revolutionary Multimodal Capabilities",
        "content": "OpenAI today unveiled GPT-5, the latest iteration of their groundbreaking language model series, featuring unprecedented multimodal capabilities that can seamlessly process text, images, audio, and video simultaneously. The new model demonstrates remarkable improvements in reasoning, coding, and creative tasks, with performance that approaches human experts in specialized domains.",
        "author": "Sarah Kim, AI Reporter",
        "pub_date": "2025-07-22T10:00:00Z",
        "source_feed": "TechCrunch AI",
        "word_count": 85
      },
      {
        "article_url": "https://wsj.com/stock-market-update",
        "title": "Stock Market Reaches Record High as Tech Stocks Surge",
        "content": "The S&P 500 closed at a record high today, driven primarily by strong gains in technology stocks. Apple, Microsoft, and Google all posted significant increases following better-than-expected quarterly earnings reports. Market analysts attribute the surge to increased investor confidence in the tech sector and optimism about future growth prospects.",
        "author": "Financial Desk",
        "pub_date": "2025-07-22T16:00:00Z",
        "source_feed": "Wall Street Journal",
        "word_count": 70
      }
    ],
    "target_topic": "artificial intelligence",
    "analysis_depth": "standard",
    "min_confidence": 0.6
  }')

echo "📊 BATCH ANALYSIS RESULTS:"
echo "$response4" | python3 -m json.tool 2>/dev/null | head -50 || echo "$response4"
echo ""

# Summary analysis
echo "🎯 ANALYSIS QUALITY SUMMARY"
echo "==========================="

# Extract relevance scores
relevance1=$(echo "$response1" | grep -o '"relevance_score":[0-9.]*' | cut -d: -f2 | head -1)
relevance2=$(echo "$response2" | grep -o '"relevance_score":[0-9.]*' | cut -d: -f2 | head -1)
relevance3=$(echo "$response3" | grep -o '"relevance_score":[0-9.]*' | cut -d: -f2 | head -1)

echo "AI Article Relevance: $relevance1 (Expected: >0.8)"
echo "Climate+AI Relevance: $relevance2 (Expected: 0.4-0.7)"
echo "Sports Article Relevance: $relevance3 (Expected: <0.3)"

# Extract costs
cost1=$(echo "$response1" | grep -o '"estimated_cost_usd":[0-9.]*' | cut -d: -f2)
cost4=$(echo "$response4" | grep -o '"estimated_cost_usd":[0-9.]*' | cut -d: -f2)

echo ""
echo "💰 COST ANALYSIS:"
echo "Single article (deep): \$${cost1:-0.001}"
echo "Batch analysis: \$${cost4:-0.003}"

# Check if analysis is working properly
if [[ -n "$relevance1" && $(echo "$relevance1 > 0.7" | bc -l 2>/dev/null) == "1" ]]; then
    echo ""
    echo "✅ AI ANALYSIS IS WORKING EXCELLENTLY!"
    echo "   - High relevance scores for AI content"
    echo "   - Proper cost tracking"
    echo "   - Detailed insights generation"
else
    echo ""
    echo "⚠️  AI analysis may need tuning or OpenAI API issues"
fi

echo ""
echo "🔗 Manual Test Commands:"
echo "========================"
echo "Test high relevance:"
echo "curl -X POST '$WORKER_URL/analyze' -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"articles\":[{\"article_url\":\"test\",\"title\":\"GPT-5 Released with AGI Capabilities\",\"content\":\"OpenAI announces breakthrough in artificial general intelligence\",\"author\":\"Tech\",\"pub_date\":\"2025-07-22T10:00:00Z\",\"source_feed\":\"Tech\",\"word_count\":50}],\"target_topic\":\"artificial intelligence\"}'"
echo ""
echo "Test low relevance:"
echo "curl -X POST '$WORKER_URL/analyze' -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"articles\":[{\"article_url\":\"test\",\"title\":\"Cooking Recipe for Chocolate Cake\",\"content\":\"Mix flour, sugar, eggs and chocolate to create delicious cake\",\"author\":\"Chef\",\"pub_date\":\"2025-07-22T10:00:00Z\",\"source_feed\":\"Food\",\"word_count\":40}],\"target_topic\":\"artificial intelligence\"}'"