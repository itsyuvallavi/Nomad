# /services - External Integrations & Business Logic

This directory handles all **external interactions and services** with side effects.

## ✅ What belongs here:
- API calls and external service integrations
- Database operations and queries
- Authentication service implementations
- Third-party service integrations (payment, email, etc.)
- Business logic that involves external dependencies
- Any code that makes network requests
- Data persistence operations

## ❌ What does NOT belong here:
- Pure utility functions (use `/lib`)
- React components (use `/components`)
- Static constants (use `/lib/constants`)
- React providers/contexts (use `/infrastructure`)

## 📁 Subdirectories:

### `/ai`
AI/LLM service integrations (OpenAI, etc.)
- Flows for itinerary generation
- Conversation management
- AI utilities and prompts

### `/api`
External API integrations
- LocationIQ for maps
- Pexels for images
- Weather APIs
- Static place data

### `/firebase`
All Firebase services
- Authentication
- Analytics
- Firestore operations

### `/storage`
Storage services
- Local storage management
- Offline storage
- IndexedDB operations

### `/trips`
Trip management services
- Trip CRUD operations
- Draft management
- Data synchronization

## Examples:
- ✅ OpenAI API calls
- ✅ Firebase authentication
- ✅ Weather API integration
- ✅ Database queries
- ❌ Date formatting (→ `/lib/helpers`)
- ❌ React components (→ `/components`)
- ❌ Static data (→ `/lib/constants`)