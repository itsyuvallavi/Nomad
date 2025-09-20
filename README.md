# Nomad Navigator

AI-powered travel planning application with real-world venues from OpenStreetMap.
**⚠️ IMPORTANT: This application exclusively uses OpenAI GPT-5 model. No other AI models are supported or should be used.**

## 🚀 Features

- **🗺️ Real Venues**: Every restaurant, hotel, and attraction is a real place from OpenStreetMap
- **🤖 Smart AI**: Conversational interface that never assumes information - asks for what it needs
- **📍 Zone-Based Planning**: Each day focuses on one neighborhood to minimize travel time
- **💯 100% Enrichment**: Every activity includes real venue data with addresses and coordinates
- **💾 Offline Support**: Save and access trips offline
- **🔒 Privacy-First**: Firebase Auth for secure user data

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI**: OpenAI GPT-5 (ONLY GPT-5 - no other models)
- **POI Data**: OpenStreetMap/Overpass API (primary), LocationIQ (fallback)
- **Backend**: Firebase (Auth, Firestore, Analytics)
- **APIs**: OpenWeather, Pexels
- **Deployment**: Firebase Hosting

## 📱 Example Output

When you ask for "3 days in Paris", the app generates:

```
Day 1: Central Paris
- 🥐 Breakfast at Café de Flore (172 Boulevard Saint-Germain)
- 🎨 Visit Louvre Museum (Rue de Rivoli, 75001)
- 🍽️ Lunch at L'Ami Louis (32 Rue du Vertbois)
- 🌳 Explore Luxembourg Gardens (6th arrondissement)
- 🍷 Dinner at Le Comptoir du Relais (9 Carrefour de l'Odéon)
```

All venues are real places with accurate addresses from OpenStreetMap!

## 🎯 Architecture

### Simplified AI System (5 core files)
```
src/services/ai/
├── ai-controller.ts       # Conversation management
├── trip-generator.ts      # Itinerary generation
├── prompts.ts            # AI templates
├── schemas.ts            # TypeScript types
└── services/
    └── osm-poi-service.ts # OpenStreetMap integration
```

### API Endpoints
- `POST /api/ai` - Conversational itinerary generation
- `POST /api/feedback` - User feedback

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key (with GPT-5 access - REQUIRED)
- Firebase project (for auth)

### Environment Variables

Create a `.env.local` file:

```bash
# Required (MUST have GPT-5 access)
OPENAI_API_KEY=your_openai_api_key_with_gpt5_access

# Firebase (Required for auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# Optional
OPENWEATHERMAP=your_weather_api_key
LOCATIONIQ_API_KEY=your_locationiq_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

Visit `http://localhost:9002` to see the app.

## 🗣️ Conversation Flow

The AI uses a "NO DEFAULTS" philosophy - it never assumes information:

1. User: "Plan a trip to London"
2. AI: "When are you planning to visit London?"
3. User: "Next month"
4. AI: "How many days will you be staying?"
5. User: "3 days"
6. AI: *Generates itinerary with real venues*

## 🗺️ OpenStreetMap Integration

The app fetches real POI data using the Overpass API:

- **Restaurants**: Real cafés, restaurants with addresses
- **Hotels**: Actual hotels with contact info
- **Attractions**: Museums, parks, landmarks with coordinates
- **Shopping**: Markets, malls, stores

Example query for restaurants in Paris:
```javascript
const pois = await osmPOIService.findPOIsByActivity('dinner', {
  name: 'Central Paris',
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 2
});
```

## 📂 Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   └── (pages)/         # App pages
├── components/          # React components
├── services/           # Business logic
│   ├── ai/            # AI services
│   ├── api/           # External APIs
│   ├── firebase/      # Firebase services
│   └── trips/         # Trip management
├── pages/              # Page components
├── lib/                # Utilities
└── infrastructure/     # Auth, contexts
```

## 🧪 Testing

```bash
# Run AI tests
npm run test:ai

# Test OSM integration
npx tsx tests/ai/test-osm-integration.ts

# Test API endpoint
npx tsx tests/test-new-api-endpoint.ts
```

## 🚀 Deployment

The app is configured for Firebase Hosting:

```bash
# Build and deploy
npm run build
firebase deploy
```

## 📝 Key Features Explained

### Zone-Based Planning
Each day focuses on one neighborhood to minimize travel:
- Day 1: Central Paris (Louvre, Palais Royal)
- Day 2: Latin Quarter (Notre-Dame, Sorbonne)
- Day 3: Montmartre (Sacré-Cœur, Moulin Rouge)

### Real Venue Enrichment
Every activity includes:
- Actual venue name
- Street address
- GPS coordinates
- Website (when available)
- Opening hours (when available)

### Conversation State Management
The AI maintains context across messages:
- Remembers destination, dates, preferences
- Allows modifications to existing itineraries
- Supports follow-up questions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenStreetMap contributors for POI data
- OpenAI for GPT-4 API
- Firebase for backend infrastructure
- Next.js team for the framework

---

Built with ❤️ for digital nomads and travel enthusiasts