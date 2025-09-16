# Conversational AI Test Scenarios

## Test Instructions
1. Start each scenario from the home page
2. Type the initial message exactly as shown
3. Follow the conversation flow and note any issues
4. Document if the AI asks for missing information appropriately
5. Check if the final itinerary contains real data from APIs

---

## 🟢 SIMPLE SCENARIOS

### Test 1: Minimal Input - Vague Request
**Initial Message:** "I want to travel"

**Expected Behavior:**
- AI should ask: WHERE would you like to go?
- Then ask: WHEN would you like to travel?
- Then ask: HOW LONG would you like to stay?
- Then ask: WHO is traveling (solo/couple/family)?
- Confirm details before generating

**Obstacles:** User provides absolutely minimal information, forcing maximum questions

---

### Test 2: One Clear Detail Only
**Initial Message:** "Barcelona"

**Expected Behavior:**
- AI should recognize Barcelona as destination
- Ask: When would you like to visit Barcelona?
- Ask: How many days?
- Ask: Travel style/companions?
- Should NOT assume any dates or duration

**Obstacles:** Single word input that could mean different things

---

## 🔴 COMPLEX SCENARIOS

### Test 3: Conflicting Information
**Initial Message:** "I want to go to Paris for 3 days but maybe London for a week"

**Expected Behavior:**
- AI should ask for clarification: "Would you like to visit both Paris and London, or are you deciding between them?"
- If both: Ask about order and time distribution
- If choosing: Help user decide
- Ask for dates after destination is clear

**Obstacles:** Ambiguous multi-destination request

---

### Test 4: Past Date Request
**Initial Message:** "Plan my trip to Tokyo last December"

**Expected Behavior:**
- AI should recognize the date is in the past
- Ask: "I notice December has passed. Would you like to plan for this coming December or another time?"
- Continue gathering information normally

**Obstacles:** Invalid temporal reference

---

### Test 5: Overly Specific with Missing Critical Info
**Initial Message:** "I need a trip with exactly 3 museums, 2 Michelin restaurants, no walking more than 5km per day, budget under $150/day, pet-friendly hotels only"

**Expected Behavior:**
- AI should acknowledge requirements
- Still ask: WHERE would you like to go?
- Ask: WHEN would you like to travel?
- Ask: HOW MANY days?
- Incorporate requirements into generation

**Obstacles:** Lots of constraints but missing basic information

---

## 🔄 MODIFICATION SCENARIOS

### Test 6: Mid-Conversation Changes
**Flow:**
1. User: "I want to go to Rome"
2. AI: Asks for dates
3. User: "Actually, make it Venice"
4. AI: Should smoothly switch to Venice and continue

**Expected Behavior:**
- AI adapts without starting over
- Maintains conversation context
- Asks remaining questions

---

### Test 7: Post-Generation Modifications
**Flow:**
1. Complete a full itinerary generation for "3 days in Madrid"
2. User: "Add 2 more days"
3. User: "Also include a day trip to Toledo"
4. User: "Change the hotel area to city center"

**Expected Behavior:**
- Each modification should be handled
- Itinerary should update accordingly
- No need to restart conversation

---

## 🎭 EDGE CASES

### Test 8: Multiple Travelers with Different Needs
**Initial Message:** "Planning a trip for me (vegetarian), my wife (gluten-free), and our 2 kids (ages 5 and 7)"

**Expected Behavior:**
- AI acknowledges dietary restrictions and kids
- Asks: Where would you like to go?
- Asks: When?
- Asks: How long?
- Generated itinerary should be family-friendly

---

### Test 9: Weather-Dependent Request
**Initial Message:** "I want to go somewhere warm next week for 4 days"

**Expected Behavior:**
- AI should ask for more specific preferences (beach? city? adventure?)
- Might suggest destinations based on weather
- Ask to confirm specific destination
- Use weather API to verify warmth

---

### Test 10: Budget-First Planning
**Initial Message:** "I have exactly $500 for everything"

**Expected Behavior:**
- AI acknowledges budget constraint
- Asks: Where would you like to go?
- Asks: When?
- Asks: How many days?
- Might suggest budget-friendly options

---

## 🚨 ERROR HANDLING SCENARIOS

### Test 11: Nonsensical Input
**Initial Message:** "Purple elephant dancing tomorrow sandwich"

**Expected Behavior:**
- AI should politely ask for clarification
- "I'd be happy to help plan your trip. Could you tell me where you'd like to go?"
- Recover gracefully

---

### Test 12: Mixed Languages
**Initial Message:** "Quiero ir a Paris pour trois días next week"

**Expected Behavior:**
- AI should understand the mixed input (Spanish/French/English)
- Respond in English
- Confirm: "Paris for 3 days next week?"
- Continue normally

---

### Test 13: Immediate Correction
**Flow:**
1. User: "5 days in London"
2. AI: Asks for dates
3. User: "Sorry I meant 7 days in Paris"

**Expected Behavior:**
- AI updates both duration and destination
- Continues with new information
- Doesn't get confused

---

## 🎯 CONVERSATION FLOW TESTS

### Test 14: Yes/No Responses
**Flow:**
1. User: "Trip to Berlin"
2. AI: "When would you like to visit Berlin?"
3. User: "Yes"
4. AI: Should recognize this doesn't answer the question and rephrase

**Expected Behavior:**
- Handle non-sequitur responses
- Rephrase questions when needed
- Guide user back on track

---

### Test 15: Information Drip
**Flow:**
1. User: "Trip"
2. AI asks for destination
3. User: "Europe"
4. AI asks for specific city/country
5. User: "Somewhere nice"
6. AI suggests options
7. User: "The first one"

**Expected Behavior:**
- Patience with vague responses
- Provide helpful suggestions
- Remember context throughout

---

## 📊 EXPECTED OUTCOMES

### ✅ Success Criteria:
1. **Never shows defaults** (no automatic London, 3 days, or tomorrow)
2. **Always asks for missing info** in a conversational way
3. **Handles corrections** smoothly
4. **Remembers context** throughout conversation
5. **Generates real data** from LocationIQ and Weather APIs
6. **Adapts to user changes** without breaking

### ❌ Failure Indicators:
1. Uses any hardcoded defaults
2. Generates without complete information
3. Loses conversation context
4. Crashes on unexpected input
5. Fails to call external APIs
6. Can't handle modifications

---

## 📝 TEST RESULTS TEMPLATE

For each test, document:

```
Test #: [Number]
Status: ⚠️ Pending | ✅ Passed | ❌ Failed
Input: [What was typed]
AI Response: [What AI said]
Issues Found: [Any problems]
APIs Called: [OpenAI/LocationIQ/Weather]
Time to Complete: [Seconds]
Notes: [Additional observations]
```

---

## 🔍 ADDITIONAL COMPLEX SCENARIOS

### Test 16: Conditional Planning
**Initial Message:** "If the weather is good, beach destination, otherwise city break"

**Expected Behavior:**
- Ask for travel dates first
- Ask for duration
- Suggest both beach and city options
- Let user choose based on preference

---

### Test 17: Group Decision Making
**Initial Message:** "We can't decide between Japan, Italy, or Mexico"

**Expected Behavior:**
- Acknowledge the options
- Ask what matters most (food? culture? adventure? budget?)
- Ask about dates and duration
- Help narrow down based on preferences
- Generate for final choice

---

### Test 18: Accessibility Requirements
**Initial Message:** "I need wheelchair accessible locations only"

**Expected Behavior:**
- Acknowledge accessibility requirement
- Ask: Where would you like to go?
- Ask: When?
- Ask: How long?
- Ensure generated venues consider accessibility

---

### Test 19: Last-Minute Planning
**Initial Message:** "I need to leave tomorrow morning"

**Expected Behavior:**
- Acknowledge urgency
- Ask: Where are you planning to go?
- Ask: How long will you be traveling?
- Focus on practical, bookable options

---

### Test 20: Business + Leisure Mix
**Initial Message:** "I have meetings Monday to Wednesday, want to explore Thursday to Sunday"

**Expected Behavior:**
- Understand mixed purpose
- Ask: Which city are your meetings in?
- Ask: Specific dates?
- Generate business-friendly options for weekdays
- Generate tourist activities for weekend

---

## 🎪 STRESS TESTS

### Test 21: Maximum Verbosity
**Initial Message:** [Insert 500+ word travel story with destination buried in middle]

**Expected Behavior:**
- Extract key information
- Confirm understanding
- Ask for missing details
- Don't get overwhelmed

---

### Test 22: Emoji and Special Characters
**Initial Message:** "🇫🇷 Paris ✈️ 5️⃣ days 🗓️ next month 💰💰💰"

**Expected Behavior:**
- Understand emoji context
- Confirm: Paris for 5 days next month?
- Ask about specific dates
- Note high budget preference

---

### Test 23: Recursive Modifications
**Flow:**
1. Generate itinerary
2. "Make it more romantic"
3. "Now more adventurous"
4. "Actually, back to romantic but keep the hiking"
5. "Add food tours"

**Expected Behavior:**
- Handle each modification
- Maintain consistency
- Don't lose previous changes
- Keep conversation context

---

## 🏁 FINAL VALIDATION

After all tests, verify:
1. **Conversation History** is maintained
2. **No Memory Leaks** (check browser console)
3. **API Rate Limits** respected
4. **Error Messages** are user-friendly
5. **Loading States** work correctly
6. **Mobile View** handles conversation well