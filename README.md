# Restaurant Booking Agent

This project is a voice-first restaurant booking system. Users speak naturally to make a reservation; the app extracts the key details (name, guests, date, time, cuisine, requests), checks weather to suggest indoor/outdoor seating, confirms the summary, and saves the booking. The UI always offers a manual form as a fallback so the flow is reliable on any device.

## Key Features

- Voice booking using the Web Speech API (TTS + STT)
- Real-time conversation view for transparency
- Weather-aware indoor/outdoor recommendation (5-day forecast)
- Hybrid input: voice plus always-editable form fields
- Local session resume after refresh
- Modular code: components, hooks, services, utils

## Architecture & Approach

The system is built around a simple state machine and clear module boundaries.

1. Voice-first, form-always-available

- Users speak; the assistant extracts values and updates the form.
- Users can edit any field at any time; voice is optional.

2. State machine (single question at a time)

- Steps: IDLE → ASK_NAME → ASK_GUESTS → ASK_DATE → ASK_TIME → ASK_CUISINE → ASK_SPECIAL_REQUEST → FETCH_WEATHER → CONFIRM_DETAILS → SAVE_BOOKING → COMPLETE.
- We only advance when the current field is valid. Optional fields come last.

3. Context management and extraction

- Backend stores short conversation history by `sessionId`.
- Gemini extracts incremental updates (only fields present in the latest user turn).
- Anti-loop rules: never repeat the same question if the user answered; ask again only when input is invalid (e.g., past date).

4. Weather-driven seating

- OpenWeatherMap 5-day/3-hour forecast is matched to the requested date/time.
- Rules prefer indoor for rain/extremes; outdoor for pleasant conditions.
- Users can override seating by voice or select in the form.

5. Modular code layout

- Backend: routes → controllers → services → utils.
- Frontend: components (UI), hooks (speech), utils (steps, patterns), config.

### Tech Stack

Backend:

- **Node.js 22 + Express 5.2** - RESTful API server
- **MongoDB Atlas + Mongoose 9.0** - NoSQL database with schema validation
- **Google Gemini AI** - `gemini-2.5-flash` model for NLP and conversation
- **OpenWeatherMap API** - 5-day/3-hour forecast (free tier)
- **nanoid 5.0** - Collision-resistant short ID generation

Frontend:

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

## Flow & Request Lifecycle

### Voice Booking Flow

1. Start

- User clicks Start. Frontend speaks a greeting and begins listening.
- Step moves to ASK_NAME.

2. Per-turn extraction

- Frontend calls `/api/chat` with the transcript and current form data.
- Backend uses Gemini to return only the fields found in that turn (e.g., `customerName`).
- UI updates the form, speaks one short follow-up question.

3. Continue until required fields complete

- Guests → Date → Time → then optional fields (Cuisine, Special Requests).
- Anti-loop rules ensure we move forward when answers are valid.

4. Weather and seating

- When required fields exist, frontend requests weather.
- Backend validates date (today → +5 days), fetches forecast, applies seating rules, and returns a recommendation.
- Frontend speaks the recommendation and asks for seating confirmation.

5. Seating confirmation

- User can say "indoor" or "outdoor" at any time in confirmation.
- We update seating instantly and proceed to full summary.

6. Save

- User says "yes". Frontend sends the form to `/api/bookings`.
- Backend validates and saves the booking with a 6-char `bookingId`.
- Frontend speaks the ID and resets after a short delay.

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

## Design Rationale (Short)

- Voice-first with form fallback: fastest on mobile, always editable.
- 5-day window: matches OpenWeatherMap free tier; keeps forecasts reliable.
- Bottom controls: fixed, reachable, large touch targets.
- Modular components: maintainable, testable, reusable.
- In-memory store: simple for demo; use Redis/Mongo in production.

## Supported Cities

- New Delhi, Mumbai, Bangalore, Kolkata, Chennai, Hyderabad, Pune, Ahmedabad
- Add more in `backend/utils/weatherAPI.js` → `CITY_COORDS`.

## Known Limitations (Short)

- Speech: best in Chrome/Edge; noise affects accuracy.
- Weather: 5-day window; 3-hour slots; forecast may change.
- AI: ambiguous phrases can misinterpret; anti-loop covers common cases.
- Rate limits: Gemini and OpenWeather free tiers apply.
- Production: no auth, conflict checks, or notifications yet; single-server state.

## Troubleshooting (Quick)

- Mic: allow permissions; close other apps; prefer Chrome/Edge.
- Speech: speak clearly; retry “Speak”; use form as fallback.
- Weather: check API key; ensure date within 5 days; city supported.
- Backend: server running; `VITE_SERVER_URL` set; CORS/port ok.
- Save: Mongo URI correct; cluster active; required fields present.

## 🔐 Security Considerations

### Current Implementation (Development Only)

⚠️ **NOT PRODUCTION-READY**

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

---

**Built with React, Node.js, Gemini AI, and OpenWeatherMap**
