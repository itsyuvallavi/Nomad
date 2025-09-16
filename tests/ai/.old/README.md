# Conversational AI Testing Suite

## 📁 Files Created

### 1. **conversational-test-scenarios.md**
Complete test scenarios covering:
- 23 different test cases
- Simple, complex, modification, and edge cases
- Each scenario includes expected behavior and obstacles
- Covers everything from minimal input to emoji handling

### 2. **test-runner.html**
Interactive HTML test dashboard:
- Visual test tracking interface
- Checkbox system for step completion
- Pass/Fail/Pending status tracking
- Note-taking for each test
- Timer and progress summary
- Can be opened directly in browser

### 3. **quick-test-reference.md**
Quick reference for testing:
- Copy-paste test commands
- Checklist of what to verify
- Common issues to watch for
- Debug commands for console
- Priority tests if short on time

### 4. **test-results-log.md**
Template for documenting results:
- Structured format for each test
- Space for actual responses
- API tracking
- Summary and recommendations sections

---

## 🚀 How to Test

### Option 1: Manual Testing (Recommended)
1. Open `quick-test-reference.md` for commands
2. Start from home page
3. Copy test inputs and paste into chat
4. Document results in `test-results-log.md`
5. Check console for API calls and errors

### Option 2: Using Test Runner
1. Open `test-runner.html` in browser
2. Keep app open in another tab
3. Click "Start Test" for each scenario
4. Input gets copied to clipboard
5. Mark steps as completed
6. Record Pass/Fail status

---

## 🎯 Key Test Objectives

### Must Verify:
1. **NO DEFAULTS** - Never shows London, 3 days, or tomorrow
2. **ASKS QUESTIONS** - Always asks for missing info
3. **REAL DATA** - LocationIQ provides real addresses
4. **WEATHER WORKS** - Weather forecasts appear
5. **MODIFICATIONS** - Can change itinerary after generation

### Watch For:
- Duplicate API calls (check console)
- Lost conversation context
- Form validation issues
- Mobile view problems
- Keyboard shortcut errors

---

## 📊 Expected Test Results

### Simple Scenarios (Tests 1-2)
Should handle minimal input by asking clarifying questions

### Complex Scenarios (Tests 3-5)
Should handle ambiguity, invalid dates, and complex requirements

### Modification Scenarios (Tests 6-7)
Should allow changes during and after generation

### Edge Cases (Tests 8-23)
Should gracefully handle:
- Nonsensical input
- Mixed languages
- Emojis
- Multiple changes
- Group travel
- Accessibility needs

---

## 🔍 What Success Looks Like

✅ **Successful Conversation Flow:**
```
User: "I want to travel"
AI: "I'd be happy to help! Where would you like to go?"
User: "Paris"
AI: "Paris sounds wonderful! When would you like to travel?"
User: "Next month"
AI: "Great! How many days would you like to spend in Paris?"
User: "5 days"
AI: "Perfect! Let me confirm: 5 days in Paris next month. Is this correct?"
User: "Yes"
AI: "Creating your personalized itinerary..."
[Generates with real data from APIs]
```

❌ **What Should NOT Happen:**
```
User: "I want to travel"
AI: "Creating a 3-day itinerary for London starting tomorrow..."
```

---

## 🛠️ Troubleshooting

### If Tests Fail:

1. **Check Console (F12)**
   - Look for error messages
   - Verify API calls are made
   - Check for duplicate requests

2. **Verify Environment**
   - Ensure all API keys are set
   - Check Firebase is running
   - Confirm you're using chat-container-v2

3. **Common Fixes**
   - Refresh page to clear state
   - Clear localStorage if needed
   - Wait between tests (rate limits)

---

## 📝 Report Issues

When reporting test failures, include:
1. Test number and name
2. Exact input used
3. AI response received
4. Console errors (if any)
5. Screenshot if relevant

---

## ⏱️ Estimated Testing Time

- **Quick Test (5 scenarios):** 15-20 minutes
- **Standard Test (10 scenarios):** 30-40 minutes
- **Complete Test (23 scenarios):** 60-90 minutes
- **With documentation:** Add 15-20 minutes

---

Happy Testing! 🚀