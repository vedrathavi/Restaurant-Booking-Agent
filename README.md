# 🍽️ Restaurant Booking Agent

An intelligent AI-powered voice-first restaurant booking system that combines natural language processing, real-time weather integration, and conversational AI to create a seamless reservation experience. The system features hands-free voice booking with live conversation display, weather-aware seating recommendations, and a clean modular architecture.

## ✨ Key Features

### Voice & Conversation
- 🎤 **Hands-Free Voice Booking** - Complete booking flow using Web Speech API (TTS + STT)
- 💬 **Real-Time Conversation UI** - Live display of user speech and bot responses with message bubbles
- 🔄 **Session Persistence** - Resume interrupted bookings automatically via localStorage
- 🎯 **Smart Intent Recognition** - Natural language understanding for seating changes, modifications, and confirmations
- 🗣️ **Natural Responses** - Gemini AI generates contextual, casual, and human-like replies

### Intelligence & Automation
- 🌤️ **Weather-Aware Seating** - Fetches 5-day forecast from OpenWeatherMap and recommends indoor/outdoor seating
- 📅 **Smart Date Parsing** - Understands "today", "tomorrow", "day after tomorrow" with automatic validation
- ⏰ **Time Zone Support** - IST (Indian Standard Time) for date/time calculations and validations
- 🚫 **Booking Window Enforcement** - Restricts bookings to next 5 days (weather API limitation)
- ✅ **Multi-Layer Validation** - Date/time validation across frontend, backend routes, and services

### User Experience
- 📱 **Responsive Two-Column Layout** - Voice assistant on left, booking form on right
- 🎨 **Circular Control Buttons** - Fixed bottom-center dock with accessible icon-only controls
- ✏️ **Hybrid Input** - Voice + manual editing; users can correct any field in the form
- 🔁 **Continue or Restart** - Smart prompt when returning to incomplete bookings
- 🎭 **Progressive Form Display** - Fields update in real-time as conversation proceeds

### Technical Excellence
- 🧩 **Modular Architecture** - Clean separation: components, hooks, utils, services
- 🔧 **Reusable Utilities** - Shared patterns for voice intents, steps, and validation helpers
- 🔐 **Error Handling** - Graceful fallbacks for speech recognition, API failures, and network issues
- 🆔 **Unique Booking IDs** - Short 6-character IDs via nanoid for easy reference

## 🏗️ Architecture & Approach

### Design Philosophy

**1. Voice-First with Manual Fallback**
- Designed for hands-free operation but never locks users into voice-only interaction
- Every field can be edited manually in the form while voice conversation continues
- Speech recognition errors don't block progress—users can type corrections

**2. Progressive Conversation Flow**
- Step-based state machine (IDLE → ASK_NAME → ASK_GUESTS → ASK_DATE → ASK_TIME → ASK_CUISINE → ASK_SPECIAL_REQUEST → FETCH_WEATHER → CONFIRM_DETAILS → SAVE_BOOKING → COMPLETE)
- Bot asks one question at a time; moves forward only when field is filled
- Optional fields (cuisine, special requests) asked after required fields
- Weather fetch happens automatically after all fields collected

**3. Intelligent Context Management**
- Backend maintains conversation history per session ID
- Gemini AI extracts booking data incrementally from multi-turn dialogue
- Anti-loop protection: bot never repeats the same question twice in a row
- Modification detection: user can change any field mid-conversation ("change date to tomorrow")

**4. Weather Integration**
- Fetches real 5-day forecast from OpenWeatherMap (3-hour intervals)
- Finds closest time slot to booking date/time
- Applies seating rules: temperature (18-30°C outdoor), rain probability (<40% outdoor), weather condition (clear/cloudy → outdoor)
- User can override recommendation via voice or dropdown

**5. Modular Component Design**
- **Backend**: Routes → Controllers → Services → Utils (weather, AI, conversation helpers)
- **Frontend**: Components (presentational) + Hooks (behavior) + Utils (shared logic)
- Each module has single responsibility; easy to test and extend

### Tech Stack

**Backend:**
- **Node.js 22 + Express 5.2** - RESTful API server
- **MongoDB Atlas + Mongoose 9.0** - NoSQL database with schema validation
- **Google Gemini AI** - `gemini-2.5-flash` model for NLP and conversation
- **OpenWeatherMap API** - 5-day/3-hour forecast (free tier)
- **nanoid 5.0** - Collision-resistant short ID generation

**Frontend:**
- **React 18 + Vite 6** - Fast dev server and optimized builds
- **Tailwind CSS 3.4** - Utility-first styling with responsive design
- **Web Speech API** - Browser-native TTS (SpeechSynthesis) and STT (SpeechRecognition)
- **Axios** - HTTP client with interceptors
- **React Icons** - Icon library for UI elements

## 📂 Project Structure

### Backend Architecture
```
backend/
├── index.js                        # Express server + MongoDB connection
├── controllers/
│   └── bookingsController.js       # Booking CRUD operations
├── models/
│   └── Booking.js                  # Mongoose schema with embedded weatherInfo
├── routes/
│   ├── bookings.js                 # /api/bookings endpoints
│   └── chat.js                     # /api/chat for voice conversations
├── services/
│   ├── conversationService.js      # Multi-turn conversation orchestrator
│   ├── conversationUtils.js        # Helper functions (isComplete, getMissingFields)
│   ├── geminiService.js            # Gemini AI integration (unused, legacy)
│   ├── geminiVoiceService.js       # Voice response generation (unused, legacy)
│   └── weatherService.js           # Weather fetch + seating recommendation
└── utils/
    ├── weatherAPI.js               # OpenWeatherMap API client + date validation
    └── seatingRecommendation.js    # Rule-based indoor/outdoor logic
```

**Key Backend Modules:**

- **conversationService.js**: Core conversation manager
  - `processConversationTurn()` - Main entry point for each user message
  - `extractBookingInfo()` - Uses Gemini to extract fields from conversation
  - `generateContextualResponse()` - Creates natural bot replies with anti-loop rules
  - In-memory conversation store (Map) indexed by sessionId

- **weatherService.js**: Weather integration orchestrator
  - Validates 5-day booking window
  - Calls `fetchWeatherForecast()` and `findClosestForecast()`
  - Returns `{ weatherInfo, seatingRecommendation }`

- **weatherAPI.js**: Direct API interaction
  - `fetchWeatherForecast()` - Calls OpenWeatherMap with lat/lon
  - `findClosestForecast()` - Finds nearest 3-hour time slot to booking time
  - Multi-layer date validation (past date + 5-day limit)

### Frontend Architecture
```
frontend/
├── src/
│   ├── components/
│   │   ├── VoiceBooking.jsx         # Main container with all business logic
│   │   ├── ConversationPane.jsx     # Left column: conversation display
│   │   ├── VoiceControls.jsx        # Bottom dock: circular control buttons
│   │   └── BookingForm.jsx          # Right column: editable form fields
│   ├── hooks/
│   │   ├── useSpeechSynthesis.js    # TTS wrapper with female voice selection
│   │   └── useSpeechRecognition.js  # STT wrapper with error handling
│   ├── utils/
│   │   ├── apiClient.js             # Axios instance with baseURL
│   │   ├── steps.js                 # STEPS enum (conversation states)
│   │   └── voicePatterns.js         # Regex helpers for intent detection
│   └── config/
│       └── constants.js             # API endpoints and HOST config
```

**Key Frontend Modules:**

- **VoiceBooking.jsx**: State machine and orchestration
  - Manages: `step`, `booking`, `conversation`, `isActive`, `weatherRecommendationGiven`
  - Handlers: `handleUserSpeech()`, `processWithGemini()`, `handleConfirmation()`
  - Flows: `startBooking()` → `fetchWeatherAndRespond()` → `saveBookingToServer()`
  - localStorage persistence for session continuity

- **ConversationPane.jsx**: Presentational component
  - Props: `conversation`, `isSpeaking`, `isListening`, `endRef`
  - Renders message bubbles with auto-scroll

- **VoiceControls.jsx**: Circular button dock
  - Props: event handlers for continue/start/speak/stop/cancel
  - Conditional rendering based on `showContinuePrompt`, `isActive`, `isListening`
  - Accessible with `title` and `aria-label`

- **BookingForm.jsx**: Editable form fields
  - Props: `booking`, `onFieldChange`, `step`, `onConfirm`
  - Two-column date/time grid, dropdown for seating, textarea for special requests

- **Hooks**: Encapsulate Web Speech API complexity
  - `useSpeechSynthesis`: Selects female voice, manages queue, pitch 1.2
  - `useSpeechRecognition`: maxAlternatives=3, error filtering, hasResult flag

- **Utils**: Shared logic and patterns
  - `steps.js`: Single source of truth for conversation steps
  - `voicePatterns.js`: Reusable regex for seating, changes, positive responses
  - `apiClient.js`: Centralized Axios with CORS config
## 🔄 Data Flow & Request Lifecycle

### Voice Booking Flow

1. **User clicks "Start Voice Booking"**
   - Frontend: `startBooking()` → speaks greeting → starts listening
   - State: `step = ASK_NAME`, `isActive = true`

2. **User speaks their name** (e.g., "John")
   - Frontend: `handleUserSpeech()` → adds to conversation → calls `processWithGemini()`
   - API Call: `POST /api/chat { sessionId, message: "John", bookingData: {...} }`
   - Backend: `conversationService.processConversationTurn()`
     - Gemini extracts: `{ customerName: "John" }`
     - Checks missing fields → generates response: "Awesome! How many guests?"
     - Returns: `{ response, bookingData: { customerName: "John" }, isComplete: false }`
   - Frontend: Updates `booking.customerName`, speaks response, continues

3. **User provides remaining fields** (guests → date → time → cuisine → special requests)
   - Same flow repeats for each field
   - Backend tracks conversation history for context
   - Anti-loop protection prevents repeated questions

4. **All fields complete → Weather fetch**
   - Frontend: `allFieldsComplete` check passes → `fetchWeatherAndRespond()`
   - API Call: `POST /api/chat { message: "Get weather for 2025-12-05 at 19:00", bookingData }`
   - Backend: `chat.js` route validates date (5-day window)
     - Calls `weatherService.getWeatherAndRecommendation()`
     - `weatherAPI.fetchWeatherForecast()` → OpenWeatherMap API
     - `findClosestForecast()` → matches 19:00 to nearest 3-hour slot
     - `recommendSeating()` → applies rules based on temp/condition/rain
   - Returns: `{ weatherInfo: {...}, seatingRecommendation: "outdoor" }`
   - Frontend: Speaks weather message + asks for seating confirmation

5. **User confirms seating**
   - Voice: "outdoor" → `handleConfirmation()` → direct seating update
   - Moves to `CONFIRM_DETAILS` → reads full booking summary

6. **User confirms booking**
   - Voice: "yes" → `moveTo(SAVE_BOOKING)`
   - API Call: `POST /api/bookings { customerName, numberOfGuests, ... }`
   - Backend: `bookingsController.createBooking()`
     - Validates all fields
     - Generates `bookingId` via `nanoid(6)`
     - Saves to MongoDB with embedded weatherInfo
   - Returns: `{ bookingId, message }`
   - Frontend: Speaks booking ID letter-by-letter → auto-resets after 5s

### Error Handling Strategy

**Frontend:**
- Speech recognition: Ignores no-speech/aborted errors; user clicks "Speak" to retry
- API failures: Shows error message in conversation; allows manual field editing
- Date validation: Rejects past dates and dates >5 days immediately; stays at ASK_DATE step

**Backend:**
- Date out of range: Returns 400 error from `chat.js` route before calling weather service
- Weather API failure: Returns `{ weatherInfo: null, seatingRecommendation: "indoor" }`
- Gemini extraction errors: Returns last known response; logs error
- MongoDB errors: Returns 500 with error message; doesn't save partial data

**Validation Layers:**
1. Frontend: Client-side date/time checks in `processWithGemini()`
2. Backend Route: Date validation in `chat.js` before weather fetch
3. Backend Service: Additional checks in `weatherAPI.fetchWeatherForecast()`
4. Database: Mongoose schema validation on save

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account (free tier works)
- OpenWeatherMap API key (free tier: 1000 calls/day)
- Google Gemini API key (free tier available)

### 1. Clone & Install

```powershell
# Clone repository
git clone https://github.com/vedrathavi/Restaurant-Booking-Agent.git
cd Restaurant-Booking-Agent

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend `.env`** (create in `backend/` directory):
```env
# MongoDB Atlas connection string
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/restaurant-booking?retryWrites=true&w=majority

# Server port (default: 4000)
PORT=4000

# OpenWeatherMap API key (get from openweathermap.org/api)
WEATHER_API_KEY=your_openweather_api_key_here
# Google Gemini API key (get from aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here
```

**Frontend `.env`** (create in `frontend/` directory):
```env
# Backend server URL (change for production deployment)
VITE_SERVER_URL=http://localhost:4000
```

**Get API Keys:**
- **MongoDB Atlas**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Create free cluster → Get connection string
- **OpenWeatherMap**: [openweathermap.org/api](https://openweathermap.org/api) → Sign up → Get API key from dashboard
- **Google Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key

### 3. Run Development Servers

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```
Server starts at `http://localhost:4000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
App opens at `http://localhost:5173`

### 4. Test the System

1. Open `http://localhost:5173` in Chrome (best Web Speech API support)
2. Allow microphone permissions when prompted
3. Click "Start Voice Booking" (circular blue microphone button at bottom)
4. Speak your booking details when prompted:
   - Name: "John Doe"
   - Guests: "4 guests" or "four people"
   - Date: "tomorrow" or "December 5th"
   - Time: "7 PM" or "19:00"
   - Cuisine: "Italian"
   - Special Requests: "Birthday celebration" or "None"
5. Bot fetches weather → recommends seating → say "outdoor" or "indoor"
6. Confirm booking → receive 6-character booking ID

## 📡 API Reference

### Bookings

**Create Booking**
```http
POST /api/bookings
Content-Type: application/json

{
  "customerName": "John Doe",
  "numberOfGuests": 4,
  "bookingDate": "2025-12-10",
  "bookingTime": "19:00",
  "cuisinePreference": "Italian",
  "seatingPreference": "outdoor",
  "location": "New Delhi"
}
```

**List All Bookings**

```http
GET /api/bookings
```

**Get Booking by ID**

```http
GET /api/bookings/:id
```

Supports both `bookingId` (nanoid) and MongoDB `_id`.

**Delete Booking**
```http
DELETE /api/bookings/:id
```
Supports both `bookingId` (nanoid) and MongoDB `_id`.

**Get All Bookings**
```http
GET /api/bookings
```
Returns array of all bookings sorted by creation date (newest first).

**Health Check**
```http
GET /health
Response: { "status": "ok", "timestamp": "2025-12-04T12:00:00.000Z" }
```

### Voice Conversation

**Process Voice Turn**
```http
POST /api/chat
Content-Type: application/json

{
  "sessionId": "session-1733328000000",
  "message": "Book a table for 4 tomorrow at 7 PM",
  "bookingData": {
    "customerName": "",
    "numberOfGuests": null,
    ...
  }
}

Response:
{
  "response": "Awesome! How many guests?",
  "bookingData": {
    "customerName": "John",
    "numberOfGuests": 4,
    "bookingDate": "2025-12-05",
    "bookingTime": "19:00",
    ...
  },
  "isComplete": false,
  "missingFields": ["cuisinePreference", "specialRequests"]
}
```

**Weather Request** (triggered automatically when all fields complete)
```http
POST /api/chat
Content-Type: application/json

{
  "sessionId": "session-1733328000000",
  "message": "Get weather for 2025-12-05 at 19:00",
  "bookingData": { ... }
}

Response:
{
  "weatherInfo": {
    "dateTime": "2025-12-05 19:00",
    "condition": "Clear",
    "temperature": 22,
    "description": "clear sky",
    "rainProbability": 0
  },
  "seatingRecommendation": "outdoor",
  "response": "Weather looks clear, around 22°C. I recommend outdoor seating..."
}
```

## 📋 Database Schema

### Booking Model
```javascript
{
  bookingId: String,             // 6-char nanoid (e.g., "a1B9xZ")
  customerName: String,          // Required
  numberOfGuests: Number,        // Required
  bookingDate: String,           // YYYY-MM-DD format, required
  bookingTime: String,           // HH:MM 24-hour format, required
  cuisinePreference: String,     // Optional (Italian, Chinese, Indian, etc.)
  specialRequests: String,       // Optional (Birthday, Anniversary, etc.)
  seatingPreference: String,     // "indoor" | "outdoor" | ""
  location: String,              // Default: "New Delhi"
  weatherInfo: {                 // Embedded weather snapshot
    dateTime: String,
    condition: String,
    temperature: Number,
    description: String,
    rainProbability: Number
  },
  status: String,                // Default: "confirmed"
  createdAt: Date,               // Auto-managed by Mongoose
  updatedAt: Date                // Auto-managed by Mongoose
}
```

**Indexes:**
- `bookingId`: Unique index for fast lookups
- `createdAt`: Descending index for sorted queries

## 🧠 AI & Logic Details

### Gemini Extraction Prompt Strategy

The system uses a carefully crafted prompt for `extractBookingInfo()`:

**Context Provided:**
- Current booking data (what's already known)
- Last 4 conversation messages
- Pre-calculated dates (TODAY, TOMORROW, DAY_AFTER_TOMORROW)
- Current time in IST

**Extraction Rules:**
1. **NAME**: Any name → `customerName` (e.g., "John" → "John")
2. **GUESTS**: Any number → `numberOfGuests` (e.g., "4" → 4, "twelve" → 12)
3. **DATE**: Relative dates converted (e.g., "tomorrow" → "2025-12-05"); rejects past dates and dates >5 days
4. **TIME**: Converts to 24h (e.g., "7pm" → "19:00", "lunch" → "12:30"); supports "same time" → current IST
5. **CUISINE**: Predefined list (Italian, Chinese, Indian, Mexican, French, etc.)
6. **SPECIAL REQUESTS**: Extracts any mentions or "None"
7. **SEATING**: Only extracts if explicitly mentioned (indoor/outdoor); never guesses

**Anti-Loop Protection:**
- Checks last assistant message
- If just asked for X and user answered, moves to next field
- Never repeats same question twice in a row

### Weather-Based Seating Logic

**Rule Priority** (in `seatingRecommendation.js`):
1. Rain/snow/thunderstorm → Indoor (highest priority)
2. Rain probability >40% → Indoor
3. Temperature <10°C or >38°C → Indoor
4. Temperature 18-30°C + clear/cloudy → Outdoor
5. Default fallback → Indoor (safe choice)

**Time Slot Matching:**
- OpenWeatherMap provides 3-hour intervals
- System finds forecast entry with minimum time difference
- Example: User books 19:00 → matches 18:00 or 21:00 slot (whichever is closer)

### Conversation State Machine

```
IDLE (initial)
  ↓ User clicks "Start"
ASK_NAME → user provides name
  ↓
ASK_GUESTS → user provides guest count
  ↓
ASK_DATE → user provides date (validated: today to +5 days)
  ↓
ASK_TIME → user provides time (validated: future time if today)
  ↓
ASK_CUISINE → user provides cuisine preference
  ↓
ASK_SPECIAL_REQUEST → user provides special requests or "none"
  ↓ (all fields complete)
FETCH_WEATHER → auto-fetches weather, recommends seating
  ↓ user confirms seating
CONFIRM_DETAILS → reads full summary, asks for confirmation
  ↓ user says "yes"
SAVE_BOOKING → saves to MongoDB
  ↓
COMPLETE → speaks booking ID, auto-resets after 5s
  ↓
IDLE (ready for next booking)
```

**Modification Handling:**
- User says "change X" at CONFIRM_DETAILS → returns to ASK_NAME
- Seating changes handled instantly without conversation re-entry
- Date/time changes reset weather recommendation

## 🎯 Key Design Decisions

### Why Voice-First?
- Hands-free operation while browsing menu/website
- Faster than typing on mobile
- Accessible for users with visual impairments or typing difficulties

### Why 5-Day Booking Window?
- OpenWeatherMap free tier provides 5-day forecast
- Restaurant bookings beyond 5 days are uncommon for casual dining
- Shorter window ensures more accurate weather predictions

### Why Circular Buttons at Bottom?
- Consistent with mobile UI patterns (floating action buttons)
- Always accessible regardless of scroll position
- Large touch targets for accessibility
- Clear visual hierarchy: conversation above, controls below

### Why Modular Components?
- **Maintainability**: Easy to locate and update specific UI sections
- **Testability**: Components can be tested in isolation
- **Reusability**: `VoiceControls` and `BookingForm` can be used in other contexts
- **Readability**: Each file <200 lines, single responsibility

### Why In-Memory Conversation Store?
- Fast lookups (Map vs database query)
- Temporary data (conversations don't need persistence)
- Simplified deployment (no Redis needed for demo/prototype)
- **Production Note**: Replace with Redis or MongoDB for multi-server deployments

## 🌍 Supported Cities & Weather

**Preconfigured Cities:**
- New Delhi, Mumbai, Bangalore, Kolkata, Chennai, Hyderabad, Pune, Ahmedabad

**To Add More Cities:**
Edit `backend/utils/weatherAPI.js` and add coordinates to `CITY_COORDS` object.

## ⚠️ Known Limitations

### Speech Recognition
- **Browser Compatibility**: Chrome/Edge recommended (best Web Speech API support)
- **Safari**: Limited speech recognition accuracy
- **Firefox**: Requires manual speech API enablement in `about:config`
- **Network Dependency**: Requires stable internet for STT
- **Background Noise**: Can affect accuracy (use in quiet environment)

### Weather Forecasting
- **5-Day Window**: Limited by OpenWeatherMap free tier
- **3-Hour Intervals**: Not minute-accurate, finds nearest forecast slot
- **Forecast Changes**: Weather can change; recommendation based on forecast at booking time
- **City Coverage**: Only major Indian cities preconfigured (expandable via config)

### Conversation AI
- **Ambiguity**: Gemini may misinterpret unclear inputs (e.g., "next week Monday")
- **Anti-Loop Patterns**: Edge cases possible in modification flow
- **In-Memory State**: Conversation history cleared on server restart
- **Single Booking**: No support for multiple concurrent bookings per session

### API Rate Limits
- **Gemini Free Tier**: 15 requests/minute
- **OpenWeather Free Tier**: 60 calls/minute, 1000 calls/day
- **No Throttling**: Production requires rate limiting implementation

### Production Readiness
- **No Authentication**: Public API endpoints (security risk)
- **No Conflict Detection**: Double-booking possible
- **No Notifications**: No email/SMS confirmations
- **No Payment**: Booking only, no deposits or payments
- **No Cancellation**: Cannot modify/cancel after booking saved
- **Single Server**: In-memory store doesn't scale horizontally

## 🛠️ Troubleshooting

### Microphone Not Working
1. Check browser permissions: **Settings → Privacy → Microphone**
2. Ensure no other apps are using microphone (Zoom, Discord, etc.)
3. Try refreshing page and allowing permissions again
4. Test microphone in system settings
5. Use **Chrome/Edge** (best Web Speech API support)

### Speech Not Recognized
1. Speak clearly and slowly
2. Reduce background noise
3. Check internet connection
4. Click "Speak Again" button
5. Use manual input as fallback (edit form fields directly)

### Weather Data Unavailable
1. Verify `OPENWEATHER_API_KEY` in backend `.env` is valid
2. Check internet connection
3. Ensure booking date is within 5-day window
4. Verify city is in supported list (`backend/utils/weatherAPI.js`)
5. Check OpenWeather API quota (1000 calls/day free tier)

### Cannot Connect to Backend
1. Verify backend server is running: `cd backend && npm run dev`
2. Check `VITE_SERVER_URL=http://localhost:4000` in frontend `.env`
3. Ensure port 4000 is not blocked by firewall
4. Check CORS settings in `backend/index.js`
5. Verify backend console shows no errors

### Booking Not Saving
1. Verify `MONGODB_URI` in backend `.env` is correct
2. Check MongoDB Atlas cluster is active (not paused)
3. Ensure all required fields are filled
4. Check backend console for error messages
5. Test MongoDB connection: Run `backend/test-weather.js`

### Bot Repeats Same Question
1. Speak the answer more clearly
2. Check conversation history (left pane) for context
3. Try manual input instead
4. Click "Start New Booking" if stuck in loop

### Build Errors
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse node_modules
Remove-Item package-lock.json
npm install

# Frontend Vite errors
cd frontend
Remove-Item -Recurse node_modules, .vite
npm install
```

## 🔐 Security Considerations

### Current Implementation (Development Only)
⚠️ **NOT PRODUCTION-READY** - This is a portfolio/demo project

- No authentication or user accounts
- API endpoints publicly accessible
- Environment variables in `.env` files (not secret managers)
- No rate limiting or request throttling
- Minimal input sanitization (Mongoose schema only)
- In-memory conversation store (ephemeral, single-server)

### For Production Deployment

**Required Implementations:**
1. **Authentication**: JWT or OAuth2 for user sessions
2. **Rate Limiting**: Express rate limiter to prevent abuse
3. **Input Validation**: Use express-validator or Joi schemas
4. **Environment Secrets**: AWS Secrets Manager, Azure Key Vault, or Doppler
5. **HTTPS & CORS**: Restrict origins, enforce SSL/TLS
6. **Database Security**: MongoDB IP whitelist, encryption at rest, regular backups
7. **Logging & Monitoring**: Winston for logs, Sentry for error tracking

## 🎓 Learning Resources

### APIs Used
- [OpenWeatherMap 5-Day Forecast API](https://openweathermap.org/forecast5)
- [Google Gemini AI Documentation](https://ai.google.dev/gemini-api/docs)
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### Frameworks & Libraries
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Mongoose Schema Reference](https://mongoosejs.com/docs/guide.html)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

### Tutorials
- [Building Conversational AI with Gemini](https://ai.google.dev/gemini-api/docs/text-generation)
- [Web Speech API Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)

## 🚀 Future Enhancements

### Phase 1: Core Features (MVP)
- [ ] **User Authentication**: Email/phone login with JWT
- [ ] **Email Confirmations**: Booking receipt via SendGrid
- [ ] **SMS Notifications**: Reminders via Twilio (1 hour before)
- [ ] **Booking Modification**: Allow users to edit/cancel bookings
- [ ] **Availability Calendar**: Show available slots, prevent double-booking

### Phase 2: Advanced Features
- [ ] **Multi-Language Support**: Hindi, Spanish, French, German (i18n)
- [ ] **Payment Integration**: Accept deposits via Stripe/Razorpay
- [ ] **Table Management**: Assign specific table numbers, floor plans
- [ ] **Waitlist System**: Queue management for walk-ins
- [ ] **Loyalty Program**: Points/rewards for repeat customers
- [ ] **Review System**: Post-dining feedback collection

### Phase 3: Business Features
- [ ] **Multi-Restaurant Tenant System**: SaaS model with subscriptions
- [ ] **Admin Dashboard**: Analytics, revenue tracking, heatmaps
- [ ] **Staff Portal**: Hostess view for seating assignments, kitchen notifications
- [ ] **Menu Integration**: Display menu, take pre-orders
- [ ] **Inventory Management**: Track table turnover, occupancy rates

### Phase 4: Scalability
- [ ] **Redis Session Store**: Replace in-memory Map for multi-server support
- [ ] **WebSocket Real-Time**: Live table status updates
- [ ] **Load Balancing**: Horizontal scaling for production
- [ ] **Docker Deployment**: Containerization for easier deployment

## 👥 Contributing

Contributions welcome! Please follow these guidelines:

### How to Contribute
1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style
- Use **ES6+ syntax** (arrow functions, destructuring, async/await)
- Follow existing patterns (modular, small functions <50 lines)
- Add comments for complex logic
- Use **Prettier** for formatting (2-space indent)
- Test locally before committing

### Pull Request Checklist
- [ ] Code follows project structure (services, controllers, utils)
- [ ] No console.log statements (use proper logging)
- [ ] All tests pass (if applicable)
- [ ] Updated README if new features added
- [ ] No merge conflicts with main branch

## 📄 License

**MIT License**

Copyright (c) 2025 Ved Rathavi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 🙋 Support & Contact

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/vedrathavi/Restaurant-Booking-Agent/issues)
- **Repository**: [github.com/vedrathavi/Restaurant-Booking-Agent](https://github.com/vedrathavi/Restaurant-Booking-Agent)
- **Developer**: Ved Rathavi
- **Portfolio**: [vedrathavi.dev](https://vedrathavi.dev) _(if applicable)_

---

**Built with React, Node.js, Gemini AI, and OpenWeatherMap**
