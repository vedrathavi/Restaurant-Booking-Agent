# Restaurant Booking Agent

AI-powered restaurant booking system with intelligent voice chat, weather-aware seating recommendations, and natural language processing.

## Features

- 🎤 **Voice Booking System** - Complete hands-free booking with Web Speech API (TTS + STT)
- 💬 **Real-time Conversation Display** - See both your words and bot responses as subtitles
- ✏️ **Manual Edit Mode** - Edit any booking field if voice recognition fails
- 🤖 **Multi-turn Voice Conversations** - Natural dialogue for booking tables
- 🌤️ **Weather Integration** - Automatic seating recommendations based on forecast
- 🗣️ **Gemini AI** - Natural language understanding and conversational responses
- 📅 **Smart Booking** - Parse relative dates ("tomorrow", "next Friday")
- 🎯 **Auto-ID Generation** - Short 6-character booking IDs via nanoid
- 🌍 **Multi-city Support** - Weather data for major Indian cities

## Tech Stack

**Backend:**

- Node.js + Express
- MongoDB + Mongoose
- Google Gemini AI (voice + NLP)
- OpenWeatherMap API
- nanoid

**Frontend:**

- React + Vite
- Tailwind CSS
- Web Speech API (SpeechSynthesis + SpeechRecognition)
- Axios

## Project Structure

```
backend/
├── index.js                     # Express server entry
├── controllers/
│   └── bookingsController.js    # CRUD operations
├── models/
│   └── Booking.js               # Mongoose schema
├── routes/
│   └── bookings.js              # API endpoints
├── services/
│   ├── conversationService.js   # Multi-turn chat manager
│   ├── geminiService.js         # NLP input formatter
│   ├── geminiVoiceService.js    # Voice responses
│   └── weatherService.js        # Weather + seating logic
└── utils/
    ├── weatherAPI.js            # OpenWeather API client
    └── seatingRecommendation.js # Rule-based seating logic

frontend/
├── src/
│   ├── components/
│   │   └── VoiceBooking.jsx       # Voice booking UI with conversation
│   ├── hooks/
│   │   ├── useSpeechSynthesis.js  # Text-to-Speech hook
│   │   └── useSpeechRecognition.js # Speech-to-Text hook
│   ├── utils/
│   │   ├── apiClient.js           # Axios instance
│   │   └── constants.js           # HOST config
│   └── config/
│       └── constants.js           # API endpoints
```

## Setup

### 1. Environment Variables

Create `backend/.env`:

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=4000
WEATHER_API_KEY=your_openweather_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Create `frontend/.env`:

```env
VITE_SERVER_URL=http://localhost:4000
```

**Get API Keys:**

- MongoDB: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- OpenWeather: [openweathermap.org/api](https://openweathermap.org/api)
- Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Install Dependencies

```powershell
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run

```powershell
# Backend (dev mode with nodemon)
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
```

Backend: `http://localhost:4000`  
Frontend: `http://localhost:5173`

## API Endpoints

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

**Health Check**

```http
GET /health
```

## Services

### Conversation Service

Multi-turn voice chat that builds booking data incrementally.

```javascript
import { processConversationTurn } from "./services/conversationService.js";

const result = await processConversationTurn(
  "session-123",
  "Book a table for 4 tomorrow"
);
// { response, bookingData, isComplete, missingFields }
```

### Weather Service

Fetches forecast and recommends seating.

```javascript
import { getWeatherAndRecommendation } from "./services/weatherService.js";

const { weatherInfo, seatingRecommendation } =
  await getWeatherAndRecommendation("2025-12-10", "19:00", "Mumbai");
```

### Gemini NLP

Format natural language → structured booking data.

```javascript
import { formatBookingInput } from "./services/geminiService.js";

const booking = await formatBookingInput(
  "Table for 2 next Friday at 8pm, Italian food"
);
// { customerName, numberOfGuests, bookingDate, bookingTime, cuisinePreference, ... }
```

## Booking Schema

```javascript
{
  bookingId: "a1B9xZ",           // auto-generated 6-char ID
  customerName: "John Doe",
  numberOfGuests: 4,
  bookingDate: "2025-12-10",     // YYYY-MM-DD
  bookingTime: "19:00",          // HH:MM (24h)
  cuisinePreference: "Italian",
  specialRequests: "Anniversary dinner",
  seatingPreference: "outdoor",
  location: "New Delhi",
  weatherInfo: {
    dateTime: "2025-12-10 19:00",
    condition: "Clear",
    temperature: 22,
    description: "clear sky",
    rainProbability: null
  },
  status: "confirmed",
  createdAt: Date,
  updatedAt: Date
}
```

## Seating Recommendation Rules

- **Indoor** if:
  - Rain/snow/thunderstorm
  - > 40% precipitation chance
  - Temp <10°C or >38°C
- **Outdoor** if:
  - Temp 18-30°C
  - Clear/few clouds

## Supported Cities

New Delhi, Mumbai, Bangalore, Kolkata, Chennai, Hyderabad, Pune, Ahmedabad

Expand in `backend/utils/weatherAPI.js`.

## Rate Limits

**Gemini API (Free Tier):**

- 15 requests/minute
- Add caching or upgrade for production

**OpenWeather (Free Tier):**

- 60 calls/minute
- 5-day forecast only

## Voice Booking UI

### Features

1. **Real-time Conversation Display**
   - Chat-style interface showing both user and bot messages
   - Auto-scrolling conversation history
   - Color-coded messages (blue for user, gray for bot, red for errors)

2. **Voice Status Indicators**
   - 🔊 Speaking indicator when bot is talking
   - 🎤 Listening indicator when microphone is active

3. **Manual Edit Mode**
   - All booking fields are editable via form inputs
   - Date and time pickers for easy selection
   - Dropdown for seating preference
   - Edit anytime during the conversation

4. **Conversation Flow**
   - ASK_NAME → ASK_GUESTS → ASK_DATE → ASK_TIME → ASK_CUISINE → ASK_SPECIAL_REQUEST → FETCH_WEATHER → CONFIRM_DETAILS → SAVE_BOOKING

5. **Browser Support**
   - Chrome/Edge (recommended) - Full Web Speech API support
   - Firefox - Limited support
   - Safari - Requires webkit prefix

### Tips

- **Voice Recognition Issues?** Use the "Speak Again" button or edit fields manually
- **Better Recognition:** Speak clearly and pause between words
- **Privacy:** Microphone access required, works on localhost or HTTPS only

## Development

**Run with logs:**

```powershell
cd backend
$env:DEBUG="*"
npm run dev
```

**Check packages:**

```powershell
npm list @google/genai mongoose express nanoid axios
```

## License

MIT

## Authors

Ved Rathavi
