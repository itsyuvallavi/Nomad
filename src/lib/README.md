# /lib - Pure Utilities & Helpers

This directory contains **pure utility functions and helpers** that can be reused across the application.

## ✅ What belongs here:
- Pure functions without side effects
- Data transformation and formatting functions
- Common constants and static configuration
- Custom React hooks
- Helper functions that don't involve external services
- Logging utilities (console logging, not external services)

## ❌ What does NOT belong here:
- API calls or external service integrations (use `/services`)
- React components (use `/components` or `/infrastructure`)
- Functions with side effects (use `/services`)
- Firebase or database operations (use `/services`)
- React providers or contexts (use `/infrastructure`)

## 📁 Subdirectories:

### `/utils`
General utility functions like animations, retry logic, etc.

### `/helpers`
Data transformation and formatting helpers

### `/constants`
Static configuration and constants (API endpoints structure, city data, etc.)

### `/monitoring`
Logging utilities and error handlers (for console/local logging, not external services)

### `/hooks`
Custom React hooks that don't involve external services

## Examples:
- ✅ Date formatting function
- ✅ Animation utilities
- ✅ Retry logic wrapper
- ✅ Static city landmarks data
- ❌ Firebase authentication (→ `/services/firebase`)
- ❌ API calls (→ `/services/api`)
- ❌ React Context (→ `/infrastructure/contexts`)