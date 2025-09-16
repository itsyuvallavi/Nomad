# Quick Test Reference Card

## 🚀 Quick Test Commands

Copy and paste these into the chat to test different scenarios:

### Basic Tests
```
I want to travel
```
```
Barcelona
```
```
Hello
```

### Complex Tests
```
I want to go to Paris for 3 days but maybe London for a week
```
```
Plan my trip to Tokyo last December
```
```
I need a trip with exactly 3 museums, 2 Michelin restaurants, no walking more than 5km per day
```

### Modification Tests (after initial generation)
```
Add 2 more days
```
```
Include a day trip to Toledo
```
```
Make it more romantic
```
```
Change the budget to luxury
```

### Edge Cases
```
Purple elephant dancing tomorrow sandwich
```
```
Quiero ir a Paris pour trois días next week
```
```
🇫🇷 Paris ✈️ 5️⃣ days 🗓️ next month 💰💰💰
```

---

## ✅ What to Check

### During Conversation:
- [ ] AI asks for destination (never defaults to London)
- [ ] AI asks for dates (never defaults to tomorrow)
- [ ] AI asks for duration (never defaults to 3 days)
- [ ] AI confirms before generating
- [ ] AI handles corrections smoothly
- [ ] AI remembers context

### After Generation:
- [ ] Itinerary has real venue addresses (from LocationIQ)
- [ ] Weather forecast appears for each day
- [ ] Activities are optimized by location/route
- [ ] No generic placeholder text
- [ ] Modifications work without restarting

### Console Checks:
- [ ] No duplicate API calls
- [ ] No keyboard shortcut errors
- [ ] LocationIQ API called
- [ ] Weather API called
- [ ] No validation errors

---

## 🔴 Common Issues to Watch For

1. **Double Messages** - Same response appears twice
2. **Default Values** - Any mention of London, 3 days, or tomorrow without user input
3. **Lost Context** - AI forgets previous parts of conversation
4. **API Failures** - No real addresses or weather data
5. **Form Issues** - Submit button not working
6. **Mobile Issues** - Chat/Itinerary tab switching problems

---

## 📊 Test Result Format

```markdown
Test: [Name]
Input: [What you typed]
Result: ✅ Passed | ❌ Failed | ⚠️ Partial
Issues: [List any problems]
Time: [How long it took]
APIs: [Which APIs were called]
```

---

## 🛠️ Debug Commands

Open browser console (F12) and look for:

### Success Indicators:
- `💬 Processing User Message`
- `🤖 AI Response: {type: 'question'}`
- `📍 LocationIQ: Found venue`
- `🌤️ Weather data fetched`

### Error Indicators:
- `❌ Conversation error`
- `Form validation errors`
- `API rate limit exceeded`
- `TypeError` or `undefined`

---

## 📝 Quick Fixes During Testing

If something breaks:

1. **Refresh the page** - Clears conversation state
2. **Check console** - F12 → Console tab
3. **Clear localStorage** - `localStorage.clear()` in console
4. **Try shorter input** - Minimum 1 character now
5. **Wait between tests** - Avoid rate limits

---

## 🎯 Priority Tests

If short on time, test these first:

1. ✅ **"I want to travel"** - Tests full conversation flow
2. ✅ **"Paris"** - Tests partial input handling
3. ✅ **Generate then "Add 2 days"** - Tests modifications
4. ✅ **Check for real addresses** - Verify LocationIQ works
5. ✅ **Check weather appears** - Verify Weather API works