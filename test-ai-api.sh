#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API endpoint
API_URL="http://localhost:9000/api/ai"

# Function to test a prompt
test_prompt() {
    local test_name="$1"
    local prompt="$2"
    local expected_destination="$3"
    
    echo -e "\n${YELLOW}Testing: ${test_name}${NC}"
    echo "Prompt: \"${prompt}\""
    echo "Expected destination: ${expected_destination}"
    echo "---"
    
    # Generate a unique session ID
    local session_id="test-$(date +%s)-$(openssl rand -hex 4)"
    
    # Send the request
    response=$(curl -s -X POST "${API_URL}" \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"${prompt}\",
            \"generationId\": \"${session_id}\"
        }")
    
    # Extract key information from response
    if echo "$response" | grep -q "\"type\":\"ready\""; then
        echo -e "${GREEN}✓ Intent extracted successfully${NC}"
        
        # Check if the response contains the correct destination
        if echo "$response" | grep -qi "${expected_destination}"; then
            echo -e "${GREEN}✓ Destination '${expected_destination}' found${NC}"
        else
            echo -e "${RED}✗ Destination '${expected_destination}' not found${NC}"
        fi
    else
        echo -e "${RED}✗ Failed to extract intent${NC}"
    fi
    
    # Show parsed intent if available
    echo "$response" | grep -o '"intent":{[^}]*}' | sed 's/^/  /'
}

echo "=============================="
echo "AI Parser Migration Test Suite"
echo "=============================="

# Test 1: Original failing case
test_prompt \
    "Original Failing Case" \
    "plan a 3 day trip to Lisbon for tomorrow" \
    "Lisbon"

# Test 2: London starting Monday
test_prompt \
    "London Starting Monday" \
    "London starting Monday" \
    "London"

# Test 3: Paris beginning next week
test_prompt \
    "Paris Beginning Next Week" \
    "Paris beginning next week" \
    "Paris"

# Test 4: Tokyo for 5 days
test_prompt \
    "Tokyo For 5 Days" \
    "Tokyo for 5 days" \
    "Tokyo"

# Test 5: Multi-city
test_prompt \
    "Multi-City Trip" \
    "I want to visit Paris and London next week" \
    "Paris"

# Test 6: Weekend Barcelona
test_prompt \
    "Weekend Barcelona" \
    "weekend trip to Barcelona" \
    "Barcelona"

# Test 7: Week in Rome
test_prompt \
    "Week in Rome" \
    "week in Rome" \
    "Rome"

# Test 8: 2 weeks Thailand
test_prompt \
    "Two Weeks Thailand" \
    "2 weeks in Thailand" \
    "Thailand"

echo -e "\n${YELLOW}Tests complete!${NC}"
