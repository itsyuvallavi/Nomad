# Nomad Navigator - Complete Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [AI System Deep Dive](#ai-system-deep-dive)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Services](#backend-services)
7. [Firebase Integration](#firebase-integration)
8. [API Integrations](#api-integrations)
9. [Data Flow](#data-flow)
10. [Development Workflow](#development-workflow)
11. [Testing Strategy](#testing-strategy)
12. [Security & Authentication](#security--authentication)
13. [Performance Optimization](#performance-optimization)
14. [Deployment](#deployment)

---

## Project Overview

**Nomad Navigator** is an AI-powered travel planning application designed for digital nomads, built with Next.js 15, OpenAI APIs, Firebase, and modern web technologies. The application provides conversational AI-driven itinerary generation with real-time location enrichment, weather forecasting, and comprehensive trip management.

### Core Features
- Conversational AI trip planning using GPT-4/GPT-3.5
- Real-time location enrichment with LocationIQ
- Weather forecasting integration
- Firebase authentication and data persistence
- Offline-first architecture with service workers
- Interactive maps and route visualization
- Trip drafts and history management
- Multi-city itinerary support

---

## Technology Stack

### Languages & Frameworks
```javascript
{
  "runtime": "Node.js v20+",
  "framework": "Next.js 15.3.3",
  "language": "TypeScript 5.x",
  "ui": "React 18.3.1",
  "styling": "Tailwind CSS 3.4.1",
  "components": "shadcn/ui + Radix UI"
}
```

### Key Dependencies

#### AI & ML
- **OpenAI SDK** (`openai@5.19.1`): GPT-4/GPT-3.5 integration
- **Google Generative AI** (`@google/generative-ai@0.24.1`): Backup AI provider
- **Genkit** (`genkit@1.14.1`): AI flow orchestration framework

#### Frontend Libraries
- **Framer Motion** (`framer-motion@12.23.12`): Advanced animations
- **React Hook Form** (`react-hook-form@7.54.2`): Form management
- **Zod** (`zod@3.25.76`): Runtime type validation
- **Lucide React** (`lucide-react@0.475.0`): Icon library
- **React Window** (`react-window@2.1.0`): Virtualization for performance

#### Maps & Location
- **Leaflet** (`leaflet@1.9.4`, `react-leaflet@4.2.1`): Map rendering
- **MapLibre GL** (`maplibre-gl@5.7.1`): Advanced map features
- **LocationIQ API**: Geocoding, places, routing (replaces Google Maps)

#### Backend & Database
- **Firebase** (`firebase@12.2.1`): Authentication, Firestore, Analytics
- **Firebase Admin** (`firebase-admin@12.7.0`): Server-side Firebase operations
- **Amadeus** (`amadeus@11.0.0`): Flight/hotel data (sandbox mode)

#### Development Tools
- **MCP Servers**: Filesystem and Puppeteer for Claude integration
- **Winston** (`winston@3.17.0`): Production logging
- **Compromise** (`compromise@14.14.4`): NLP for intent understanding

---

## Architecture Overview

### Directory Structure
```
nomad-navigator/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── ai/            # AI endpoints
│   │   │   └── feedback/      # User feedback
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Home page (main app entry)
│   │   ├── trips/page.tsx     # Trip history
│   │   ├── favorites/         # Saved trips
│   │   ├── profile/           # User profile
│   │   └── settings/          # App settings
│   │
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components (shadcn)
│   │   ├── chat/              # Chat interface components
│   │   ├── itinerary/         # Trip display components
│   │   ├── map/               # Map visualization
│   │   ├── forms/             # Input forms
│   │   ├── auth/              # Authentication UI
│   │   ├── navigation/        # Nav components
│   │   └── providers/         # Context providers
│   │
│   ├── services/              # Business logic (CRITICAL)
│   │   ├── ai/               # AI processing
│   │   │   ├── flows/        # AI flow definitions
│   │   │   ├── conversation/ # Conversational AI logic
│   │   │   ├── utils/        # AI utilities
│   │   │   └── services/     # AI service integrations
│   │   ├── api/              # External API clients
│   │   ├── firebase/         # Firebase services
│   │   ├── trips/            # Trip management
│   │   └── storage/          # Offline storage
│   │
│   ├── lib/                   # Utilities & constants
│   │   ├── utils/            # Helper functions
│   │   ├── constants/        # App constants
│   │   └── monitoring/       # Logging & error handling
│   │
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React contexts
│   └── types/                 # TypeScript definitions
│
├── config/                     # Configuration files
├── data/                      # Static/mock data
├── public/                    # Static assets
├── tests/                     # Test suites
└── scripts/                   # Build/utility scripts
```

### Component Architecture

The application follows a **layered architecture**:

1. **Presentation Layer** (`/app`, `/components`)
   - Next.js pages and React components
   - UI/UX interactions
   - Form handling and validation

2. **Service Layer** (`/services`)
   - Business logic implementation
   - AI orchestration
   - External API integration
   - Data transformation

3. **Data Layer** (`/services/firebase`, `/services/storage`)
   - Firebase Firestore persistence
   - Local storage management
   - Offline data sync

4. **Infrastructure Layer** (`/lib`)
   - Utilities and helpers
   - Error handling
   - Logging and monitoring
   - Constants and configuration

---

## AI System Deep Dive

### AI Architecture Overview

The AI system uses a **multi-layered conversational approach** with intelligent fallbacks:

```typescript
// Core AI Flow
User Input → Intent Analysis → Context Extraction →
Response Generation → Itinerary Creation →
Location Enrichment → Weather Integration → Final Output
```

### Key AI Components

#### 1. Conversation Controller (`/services/ai/conversation/`)

**ai-conversation-controller.ts**
```typescript
export class AIConversationController {
  private analyzer: AIPoweredAnalyzer;
  private conversationHistory: string[];
  private collectedData: ExtractedInfo;

  async processMessage(message: string): Promise<ConversationResponse> {
    // 1. Analyze user intent with AI
    const analysis = await this.analyzer.analyzeUserMessage(
      message,
      this.conversationHistory,
      this.collectedData
    );

    // 2. Extract information
    this.collectedData = {...this.collectedData, ...analysis.extractedInfo};

    // 3. Determine response type
    if (analysis.readyToGenerate) {
      return this.generateItinerary();
    } else if (analysis.missingInfo.length > 0) {
      return this.askForMissingInfo(analysis);
    }

    // 4. Generate contextual response
    return this.generateResponse(analysis);
  }
}
```

#### 2. AI-Powered Analyzer (`ai-powered-analyzer.ts`)

Uses OpenAI to understand user intent without hardcoded patterns:

```typescript
export class AIPoweredAnalyzer {
  async analyzeUserMessage(
    message: string,
    history: string[],
    existingData: ExtractedInfo
  ): Promise<AnalysisResult> {
    const prompt = `Analyze this travel request and extract:
    - Destination (required)
    - Duration/dates
    - Travel style
    - Budget
    - Interests
    - Group size

    Message: ${message}
    Context: ${JSON.stringify(existingData)}

    Return JSON with extracted info and what's missing.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{role: 'system', content: prompt}],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  }
}
```

#### 3. Conversational Generator (`conversational-generator.ts`)

Generates complete itineraries using extracted information:

```typescript
export async function generateConversationalItinerary(
  prompt: string,
  conversationHistory: string
): Promise<GeneratePersonalizedItineraryOutput> {
  // 1. Understand trip requirements
  const tripInfo = await understandTripIntent(prompt);

  // 2. Generate vacation activities
  const days = await generateVacationActivities(
    tripInfo.destination,
    tripInfo.duration,
    tripInfo.includeCoworking
  );

  // 3. Format itinerary structure
  const itinerary = formatItinerary(days, tripInfo);

  // 4. Enrich with location data
  const enriched = await enrichItineraryWithLocationIQ(itinerary);

  // 5. Add weather forecasts
  const withWeather = await addWeatherForecasts(enriched);

  // 6. Estimate costs
  const withCosts = await estimateTripCost(withWeather);

  return withCosts;
}
```

### AI Models & Providers

#### Primary Provider: OpenAI
```typescript
// Configuration in openai-config.ts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false // Server-side only
});

// Model selection based on task
const models = {
  'conversation': 'gpt-3.5-turbo',      // Fast responses
  'generation': 'gpt-4o-mini',          // Quality generation
  'analysis': 'gpt-3.5-turbo',          // Intent understanding
  'refinement': 'gpt-4'                 // Complex modifications
};
```

#### Prompt Engineering Strategy

1. **System Prompts**: Define AI behavior and constraints
2. **Few-shot Examples**: Provide example outputs for consistency
3. **JSON Response Format**: Structured outputs for parsing
4. **Context Injection**: Include conversation history for coherence

### AI Flow Schemas (Zod)

```typescript
// Activity Schema
export const ActivitySchema = z.object({
  time: z.string(),
  description: z.string(),
  category: z.enum(['Work', 'Leisure', 'Food', 'Travel', 'Accommodation', 'Attraction']),
  address: z.string(),
  venue_name: z.string().optional(),
  venue_search: z.string().optional()
});

// Daily Itinerary Schema
export const DailyItinerarySchema = z.object({
  day: z.number(),
  date: z.string(),
  title: z.string(),
  activities: z.array(ActivitySchema),
  weather: WeatherSchema.optional()
});

// Complete Itinerary Schema
export const ItinerarySchema = z.object({
  destination: z.string(),
  title: z.string(),
  itinerary: z.array(DailyItinerarySchema),
  quickTips: z.array(z.string()),
  _costEstimate: CostEstimateSchema.optional()
});
```

### AI Training & Optimization

#### Intent Understanding
- Uses NLP library (Compromise) for initial parsing
- OpenAI for complex intent extraction
- Pattern matching for common requests

#### Response Quality
- Validates all generated content against schemas
- Fallback to simpler models on error
- Retry logic with exponential backoff

#### Cost Optimization
- GPT-3.5-turbo for simple tasks (90% of requests)
- GPT-4 only for complex multi-city or refinement
- Response caching for common destinations
- Streaming responses for perceived performance

---

## Frontend Architecture

### Component Structure

#### Page Components (`/app`)

**Home Page (page.tsx)**
```typescript
export default function Home() {
  const [currentView, setCurrentView] = useState<'start' | 'chat'>('start');
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  const [savedChatState, setSavedChatState] = useState<ChatState | undefined>();

  // Dynamic component loading for performance
  const ChatDisplay = dynamic(() => import('@/components/chat/chat-container-v2'), {
    ssr: false
  });

  return (
    <div className="min-h-screen">
      <Header />
      {currentView === 'start' ? (
        <StartItinerary onSubmit={handleTripStart} />
      ) : (
        <ChatDisplay
          initialPrompt={initialPrompt}
          savedChatState={savedChatState}
        />
      )}
    </div>
  );
}
```

#### Chat Interface (`/components/chat`)

**ChatContainer V2** - Conversational UI
```typescript
export default function ChatDisplayV2({
  initialPrompt,
  savedChatState,
  onError,
  onReturn
}: ChatDisplayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [conversationContext, setConversationContext] = useState<string>();

  // Handle conversational flow
  async function handleUserMessage(input: string) {
    const response = await generatePersonalizedItineraryV2({
      prompt: input,
      conversationHistory: conversationContext,
      sessionId
    });

    switch(response.type) {
      case 'question':
        // AI needs more info
        addMessage('assistant', response.message);
        setAwaitingInput(response.awaitingInput);
        break;

      case 'itinerary':
        // Generation complete
        setCurrentItinerary(response.itinerary);
        saveTripToFirebase(response.itinerary);
        break;
    }
  }

  return (
    <div className="flex h-screen">
      <ChatPanel messages={messages} onSendMessage={handleUserMessage} />
      {currentItinerary && <ItineraryPanel itinerary={currentItinerary} />}
      <MapPanel itinerary={currentItinerary} />
    </div>
  );
}
```

### UI Components (`/components/ui`)

Built on **shadcn/ui** with Radix UI primitives:

```typescript
// Button Component
export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

// Dialog Component (Modal)
export function Dialog({ children, ...props }: DialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogContent>{children}</DialogContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

### State Management

#### Context Providers

**AuthContext** - Global authentication state
```typescript
export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}>({});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, ...authMethods }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### Custom Hooks

**useKeyboardShortcuts** - Keyboard navigation
```typescript
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.key}`;
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

**useSwipeGestures** - Mobile touch interactions
```typescript
export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50
}: SwipeConfig) {
  const bind = useGesture({
    onDrag: ({ direction: [dx], distance, last }) => {
      if (last && distance > threshold) {
        if (dx > 0) onSwipeRight?.();
        if (dx < 0) onSwipeLeft?.();
      }
    }
  });

  return bind;
}
```

### Animation System (Framer Motion)

```typescript
// Animation Variants
export const fadeInScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

export const slideInFromRight = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 }
};

// Usage in Components
<motion.div
  variants={fadeInScale}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

---

## Backend Services

### API Routes (`/app/api`)

#### AI Generation Endpoints

**`/api/ai/generate-itinerary-v2/route.ts`**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prompt, conversationContext, sessionId } = body;

  // Call conversational AI service
  const response = await generatePersonalizedItineraryV2({
    prompt,
    conversationHistory: conversationContext,
    sessionId
  });

  return NextResponse.json({
    success: true,
    data: response
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout
```

### Service Layer (`/services`)

#### Trip Management Service
```typescript
// trips-service.ts
export class TripsService {
  private db = getFirestore();
  private auth = getAuth();

  async saveTrip(itinerary: Itinerary): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const tripData = {
      ...itinerary,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(
      collection(this.db, 'trips'),
      tripData
    );

    return docRef.id;
  }

  async getUserTrips(): Promise<Trip[]> {
    const user = this.auth.currentUser;
    if (!user) return [];

    const q = query(
      collection(this.db, 'trips'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Trip));
  }
}
```

#### Draft Manager Service
```typescript
// draft-manager.ts
export class DraftManager {
  private storage = offlineStorage;
  private autoSaveInterval = 5000; // 5 seconds

  async saveDraft(tripId: string, data: Partial<Itinerary>) {
    const key = `draft_${tripId}`;
    await this.storage.setItem(key, {
      ...data,
      lastSaved: Date.now()
    });
  }

  async getDraft(tripId: string): Promise<Partial<Itinerary> | null> {
    const key = `draft_${tripId}`;
    return await this.storage.getItem(key);
  }

  startAutoSave(tripId: string, getData: () => Partial<Itinerary>) {
    return setInterval(() => {
      this.saveDraft(tripId, getData());
    }, this.autoSaveInterval);
  }
}
```

---

## Firebase Integration

### Configuration & Initialization

```typescript
// firebase/auth.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "nomadoldrepair-86680360-86245.firebaseapp.com",
  projectId: "nomadoldrepair-86680360-86245",
  storageBucket: "nomadoldrepair-86680360-86245.firebasestorage.app",
  messagingSenderId: "336606783309",
  appId: "1:336606783309:web:a09a6e10579788ea0bf904"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
```

### Authentication Flow

```typescript
// Sign Up
export async function signUpUser(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Create user profile in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    createdAt: serverTimestamp(),
    preferences: {
      theme: 'light',
      notifications: true
    }
  });

  return userCredential.user;
}

// Sign In
export async function signInUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Log analytics event
  logEvent(analytics, 'login', {
    method: 'email'
  });

  return userCredential.user;
}

// Sign Out
export async function signOutUser() {
  await signOut(auth);
  // Clear local storage
  localStorage.removeItem('recentSearches');
  localStorage.removeItem('viewingTrip');
}
```

### Firestore Data Structure

```javascript
// Collections Structure
{
  "users": {
    "{userId}": {
      "email": "user@example.com",
      "displayName": "John Doe",
      "photoURL": "https://...",
      "createdAt": Timestamp,
      "preferences": {
        "theme": "light",
        "notifications": true,
        "defaultCurrency": "USD"
      }
    }
  },

  "trips": {
    "{tripId}": {
      "userId": "{userId}",
      "destination": "Paris, France",
      "title": "Paris Adventure",
      "startDate": "2024-06-01",
      "endDate": "2024-06-07",
      "itinerary": [/* Daily activities */],
      "quickTips": ["Tip 1", "Tip 2"],
      "createdAt": Timestamp,
      "updatedAt": Timestamp,
      "shared": false,
      "collaborators": []
    }
  },

  "favorites": {
    "{userId}": {
      "trips": ["{tripId1}", "{tripId2}"],
      "destinations": ["Paris", "Tokyo"],
      "activities": []
    }
  }
}
```

### Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Trips are private by default
    match /trips/{tripId} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         request.auth.uid in resource.data.collaborators ||
         resource.data.shared == true);
      allow write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }

    // Favorites are user-specific
    match /favorites/{userId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == userId;
    }
  }
}
```

---

## API Integrations

### LocationIQ (Primary Location Service)

Replaces Google Maps/Places with a unified solution:

```typescript
// locationiq.ts
export class LocationIQService {
  private apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
  private baseUrl = 'https://us1.locationiq.com/v1';

  // Geocoding - Convert address to coordinates
  async geocode(address: string): Promise<Coordinates> {
    const response = await fetch(
      `${this.baseUrl}/search?` +
      `key=${this.apiKey}&` +
      `q=${encodeURIComponent(address)}&` +
      `format=json&limit=1`
    );

    const data = await response.json();
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }

  // Reverse Geocoding - Convert coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<Address> {
    const response = await fetch(
      `${this.baseUrl}/reverse?` +
      `key=${this.apiKey}&` +
      `lat=${lat}&lon=${lng}&` +
      `format=json`
    );

    const data = await response.json();
    return data.address;
  }

  // Search Places - Find venues/attractions
  async searchPlaces(query: string, city?: string): Promise<Place[]> {
    const searchQuery = city ? `${query} ${city}` : query;

    const response = await fetch(
      `${this.baseUrl}/search?` +
      `key=${this.apiKey}&` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `format=json&` +
      `extratags=1&` + // Include additional info
      `limit=10`
    );

    const data = await response.json();
    return data.map(this.formatPlace);
  }

  // Route Calculation
  async getRoute(waypoints: Coordinates[]): Promise<Route> {
    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');

    const response = await fetch(
      `${this.baseUrl}/directions/v2/route?` +
      `key=${this.apiKey}&` +
      `coordinates=${coords}&` +
      `profile=driving-car&` +
      `alternatives=false&` +
      `geometries=geojson`
    );

    const data = await response.json();
    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry
    };
  }
}
```

### Weather API Integration

```typescript
// weather.ts
export async function getWeatherForecast(
  destination: string,
  startDate: string,
  days: number
): Promise<WeatherData[]> {
  const apiKey = process.env.OPENWEATHERMAP;

  // Get coordinates for destination
  const coords = await geocode(destination);

  // Fetch weather forecast
  const response = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?` +
    `lat=${coords.lat}&lon=${coords.lng}&` +
    `exclude=minutely,hourly&` +
    `units=metric&` +
    `appid=${apiKey}`
  );

  const data = await response.json();

  return data.daily.slice(0, days).map((day: any) => ({
    temp: {
      min: day.temp.min,
      max: day.temp.max,
      day: day.temp.day
    },
    weather: {
      main: day.weather[0].main,
      description: day.weather[0].description,
      icon: day.weather[0].icon
    },
    humidity: day.humidity,
    wind_speed: day.wind_speed,
    pop: day.pop // Probability of precipitation
  }));
}
```

### Amadeus (Flight/Hotel Data - Sandbox)

```typescript
// Note: Currently in sandbox mode with mock data
export class AmadeusService {
  private client: Amadeus;

  constructor() {
    this.client = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname: 'test' // Sandbox environment
    });
  }

  async searchFlights(params: FlightSearchParams) {
    try {
      const response = await this.client.shopping.flightOffersSearch.get({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
        currencyCode: params.currency || 'USD'
      });

      return response.data;
    } catch (error) {
      // Fallback to mock data in sandbox
      return getMockFlightData(params);
    }
  }

  async searchHotels(params: HotelSearchParams) {
    try {
      const response = await this.client.shopping.hotelOffers.get({
        cityCode: params.cityCode,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        adults: params.adults,
        radius: 5,
        radiusUnit: 'KM'
      });

      return response.data;
    } catch (error) {
      // Fallback to mock data in sandbox
      return getMockHotelData(params);
    }
  }
}
```

---

## Data Flow

### User Journey Flow

```
1. User Input
   ↓
2. Chat Interface (chat-container-v2.tsx)
   ↓
3. API Route (/api/ai/generate-itinerary-v2)
   ↓
4. AI Conversation Controller
   ↓
5. Intent Analysis (AI-Powered Analyzer)
   ↓
6. Information Collection Loop
   ├── Missing Info → Ask Question → Back to User
   └── Complete Info → Continue
   ↓
7. Itinerary Generation (Conversational Generator)
   ↓
8. Location Enrichment (LocationIQ)
   ↓
9. Weather Integration (OpenWeatherMap)
   ↓
10. Cost Estimation (OpenAI)
    ↓
11. Firebase Persistence
    ↓
12. UI Rendering (Itinerary View + Map)
```

### State Management Flow

```typescript
// Client-side state flow
interface AppState {
  // Authentication
  user: User | null;

  // Chat State
  messages: Message[];
  conversationContext: string;
  awaitingInput: string | undefined;

  // Itinerary State
  currentItinerary: Itinerary | null;
  draftItinerary: Partial<Itinerary> | null;

  // UI State
  currentView: 'start' | 'chat' | 'itinerary';
  mobileActiveTab: 'chat' | 'itinerary' | 'map';
  isGenerating: boolean;
  error: string | null;
}

// State Updates
User Action → Component Handler → Service Call →
State Update → UI Re-render → Effect Triggers
```

### Caching Strategy

```typescript
// Multi-layer caching
1. Browser Cache (Service Worker)
   - Static assets
   - API responses (5 min TTL)

2. Local Storage
   - Recent searches
   - User preferences
   - Draft trips

3. IndexedDB (via offline-storage.ts)
   - Complete trips
   - Offline queue
   - Large data sets

4. Memory Cache
   - Active conversation context
   - Current itinerary
   - UI state

5. Firebase Cache
   - Firestore offline persistence
   - Auth state persistence
```

---

## Development Workflow

### Environment Setup

```bash
# Required Environment Variables
OPENAI_API_KEY=sk-...                    # OpenAI API key
NEXT_PUBLIC_LOCATIONIQ_API_KEY=pk_...    # LocationIQ key
NEXT_PUBLIC_FIREBASE_API_KEY=...         # Firebase config
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
AMADEUS_API_KEY=...                      # Amadeus sandbox
AMADEUS_API_SECRET=...
OPENWEATHERMAP=...                       # Weather API
```

### Development Commands

```bash
# Start development server
npm run dev                 # Next.js on port 9002

# AI Development
npm run genkit:dev         # Genkit UI on port 4000
npm run dev:both           # Both servers parallel

# Testing
npm run test:ai --baseline  # Critical baseline test
npm run test:ai            # Full AI test suite
npm run test:integration   # Integration tests

# Code Quality
npm run typecheck          # TypeScript validation
npm run lint               # ESLint checks
npm run build              # Production build test

# Logs & Monitoring
npm run logs:ai            # View AI request logs
npm run logs:production    # Production logs
```

### Git Workflow

```bash
# Branch naming
feature/[component]-[description]  # feature/chat-voice-input
fix/[issue]-[description]          # fix/auth-token-refresh
refactor/[area]-[description]      # refactor/ai-flow-optimization

# Commit message format
[type]: [description]

# Types
feat: New feature
fix: Bug fix
refactor: Code improvement
test: Test addition/modification
docs: Documentation update
style: Code formatting
perf: Performance improvement
```

---

## Testing Strategy

### AI Testing Framework

```typescript
// ai-testing-monitor.ts
export class AITestingMonitor {
  private testSuites = {
    baseline: [
      { prompt: "3 days in London", expectedDays: 3 },
      { prompt: "Weekend in Paris", expectedDays: 2 },
      { prompt: "Tokyo for a week", expectedDays: 7 }
    ],
    complex: [
      { prompt: "London and Paris, 5 days", expectedCities: 2 },
      { prompt: "Digital nomad month in Bali", includesCoworking: true }
    ],
    edge: [
      { prompt: "Tomorrow", requiresDateParsing: true },
      { prompt: "Somewhere warm", requiresLocationSuggestion: true }
    ]
  };

  async runBaseline(): Promise<TestResults> {
    const results = [];

    for (const test of this.testSuites.baseline) {
      const start = Date.now();

      try {
        const response = await generatePersonalizedItinerary({
          prompt: test.prompt
        });

        // Validate response
        const valid =
          response.itinerary.length === test.expectedDays &&
          response.destination &&
          response.title;

        results.push({
          test: test.prompt,
          success: valid,
          duration: Date.now() - start,
          error: valid ? null : 'Validation failed'
        });
      } catch (error) {
        results.push({
          test: test.prompt,
          success: false,
          duration: Date.now() - start,
          error: error.message
        });
      }
    }

    return { results, timestamp: Date.now() };
  }
}
```

### Test Execution

```bash
# Run specific test suites
npm run test:ai --baseline     # Must always pass
npm run test:ai --complex       # Can have occasional failures
npm run test:ai --edge          # Edge cases, expect some failures

# Automated testing
npm run test:ai:auto           # Runs all suites with reporting

# Integration testing
npm run test:integration       # Full app flow testing
```

---

## Security & Authentication

### Authentication Flow

```typescript
// Multi-provider authentication support
1. Email/Password (Primary)
2. Google OAuth (Planned)
3. Magic Link (Planned)

// Session Management
- Firebase Auth handles session tokens
- Tokens auto-refresh before expiration
- Secure HTTP-only cookies for SSR
```

### Security Measures

```typescript
// API Security
export async function validateRequest(request: NextRequest) {
  // 1. Check authentication
  const token = request.headers.get('Authorization');
  if (!token) throw new Error('Unauthorized');

  // 2. Verify Firebase token
  const decodedToken = await admin.auth().verifyIdToken(token);

  // 3. Rate limiting
  const ip = request.ip || 'unknown';
  if (await isRateLimited(ip)) {
    throw new Error('Rate limit exceeded');
  }

  // 4. Input validation
  const body = await request.json();
  validateInput(body);

  return { userId: decodedToken.uid, body };
}

// Data Sanitization
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
```

### API Key Management

```typescript
// Secure API key storage
- Server-side only: OPENAI_API_KEY, AMADEUS_SECRET
- Client-side allowed: NEXT_PUBLIC_* keys
- Environment-based configuration
- Key rotation support
```

---

## Performance Optimization

### Code Splitting & Lazy Loading

```typescript
// Dynamic imports for heavy components
const ChatDisplay = dynamic(
  () => import('@/components/chat/chat-container-v2'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

const MapPanel = dynamic(
  () => import('@/components/map/map-panel'),
  {
    ssr: false,
    loading: () => <MapSkeleton />
  }
);
```

### React Optimization

```typescript
// Memoization for expensive computations
const processedActivities = useMemo(() => {
  return activities.map(activity => ({
    ...activity,
    coordinates: geocodeAddress(activity.address)
  }));
}, [activities]);

// Component memoization
const ActivityCard = React.memo(({ activity }: Props) => {
  return <div>{activity.description}</div>;
}, (prevProps, nextProps) => {
  return prevProps.activity.id === nextProps.activity.id;
});

// Virtual scrolling for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ActivityCard activity={items[index]} />
    </div>
  )}
</FixedSizeList>
```

### API Response Optimization

```typescript
// Streaming responses
export async function* streamItinerary(prompt: string) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  });

  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content || '';
  }
}

// Response compression
import { compress } from 'lz-string';

export function compressResponse(data: any): string {
  return compress(JSON.stringify(data));
}

// Caching strategy
const cache = new Map<string, CachedResponse>();

export async function getCachedOrFetch(
  key: string,
  fetcher: () => Promise<any>,
  ttl: number = 300000 // 5 minutes
) {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}
```

### Image Optimization

```typescript
// Lazy image loading component
export function LazyImage({ src, alt, ...props }: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('/placeholder.jpg');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      loading="lazy"
      {...props}
    />
  );
}
```

---

## Deployment

### Build Configuration

```javascript
// next.config.js
module.exports = {
  output: 'export', // Static export for Firebase hosting
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    // Build-time environment variables
  },
  webpack: (config) => {
    // Custom webpack configuration
    return config;
  }
};
```

### Firebase Deployment

```bash
# Build and deploy process
npm run build:export        # Next.js static build
firebase deploy --only hosting,firestore

# Deployment configuration (firebase.json)
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Environment Configuration

```bash
# Production environment
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_API_URL=https://api.nomadnavigator.app
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nomadnavigator.firebaseapp.com

# Staging environment
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_API_URL=https://staging-api.nomadnavigator.app
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nomadnavigator-staging.firebaseapp.com
```

### Monitoring & Analytics

```typescript
// Production monitoring setup
export function initMonitoring() {
  // Firebase Analytics
  if (typeof window !== 'undefined') {
    const analytics = getAnalytics();
    logEvent(analytics, 'app_start', {
      version: process.env.NEXT_PUBLIC_APP_VERSION
    });
  }

  // Error tracking
  window.addEventListener('error', (event) => {
    logError('client_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Performance monitoring
  if ('performance' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        logPerformance(entry.name, entry.duration);
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
}
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### AI Generation Failures
```typescript
// Problem: OpenAI API timeout
Solution: Implement retry logic with exponential backoff

// Problem: Malformed AI response
Solution: Add JSON parsing fallbacks and validation

// Problem: Rate limiting
Solution: Implement request queuing and caching
```

#### Firebase Issues
```typescript
// Problem: Authentication state lost on refresh
Solution: Implement auth state persistence

// Problem: Firestore offline sync issues
Solution: Enable offline persistence in Firebase config

// Problem: Security rules blocking access
Solution: Review and update Firestore security rules
```

#### Performance Issues
```typescript
// Problem: Slow initial page load
Solution: Implement code splitting and lazy loading

// Problem: Large bundle size
Solution: Analyze with next-bundle-analyzer, remove unused deps

// Problem: Memory leaks in chat interface
Solution: Cleanup effect subscriptions and event listeners
```

---

## Future Enhancements

### Planned Features
1. **Voice Input**: Speech-to-text for chat interface
2. **Collaborative Planning**: Multi-user trip planning
3. **Booking Integration**: Direct flight/hotel booking
4. **Offline Mode**: Complete offline functionality
5. **Mobile Apps**: React Native iOS/Android apps
6. **AI Personalization**: Learning user preferences
7. **Social Features**: Trip sharing and recommendations
8. **Budget Tracking**: Real-time expense management

### Architecture Improvements
1. **Microservices**: Split monolith into services
2. **GraphQL**: Replace REST with GraphQL API
3. **Edge Functions**: Move AI to edge for lower latency
4. **WebSockets**: Real-time collaboration features
5. **Redis Cache**: Distributed caching layer
6. **Message Queue**: Async job processing
7. **CDN**: Global content delivery
8. **Kubernetes**: Container orchestration

---

## Conclusion

Nomad Navigator represents a modern, AI-first approach to travel planning, combining conversational AI, real-time data enrichment, and a responsive user interface. The architecture is designed for scalability, maintainability, and exceptional user experience.

The key strengths of the system include:
- **Conversational AI** that understands context and intent
- **Modular architecture** with clear separation of concerns
- **Offline-first design** with progressive enhancement
- **Type-safe development** with TypeScript and Zod
- **Performance optimization** at every layer
- **Comprehensive testing** and monitoring

This documentation serves as a complete reference for understanding, maintaining, and extending the Nomad Navigator application.