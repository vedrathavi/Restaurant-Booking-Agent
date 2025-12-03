// utils/weatherAPI.js
// Fetches OpenWeatherMap One Call 3.0 forecast for a city and date
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_CITY = "New Delhi";
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

// City coordinates mapping (expand as needed)
const CITY_COORDS = {
  "new delhi": { lat: 28.6139, lon: 77.209 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
};

export async function fetchWeatherForecast(city = DEFAULT_CITY, bookingDate) {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("WEATHER_API_KEY not set in environment");
  }

  // Validate booking date is within 5-day forecast window
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDateObj = new Date(bookingDate + 'T00:00:00');
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 5);
  
  if (bookingDateObj < today) {
    throw new Error(`Cannot get weather for past date: ${bookingDate}`);
  }
  
  if (bookingDateObj > maxDate) {
    throw new Error(`Weather forecast only available for next 5 days. Requested: ${bookingDate}, Max: ${maxDate.toISOString().split('T')[0]}`);
  }

  // Get coordinates for city (case-insensitive lookup)
  const cityLower = city.toLowerCase();
  const coords = CITY_COORDS[cityLower] || {
    lat: DEFAULT_LAT,
    lon: DEFAULT_LNG,
  };

  const lat = coords.lat;
  const lon = coords.lon;

  // Use 5-day forecast API (free tier, 3-hour intervals)
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function findClosestForecast(apiResponse, bookingDate, bookingTime) {
  // bookingDate: "YYYY-MM-DD", bookingTime: "HH:MM"
  // Note: This function assumes bookingDate is within 5-day forecast window (validated upstream)
  const targetDt = new Date(`${bookingDate}T${bookingTime}:00`);
  const targetEpoch = Math.floor(targetDt.getTime() / 1000);

  // 5-day forecast API returns 'list' with 3-hour intervals (max ~40 data points)
  const list = apiResponse.list || [];
  let closest = null;
  let minDiff = Infinity;

  for (const entry of list) {
    const diff = Math.abs(entry.dt - targetEpoch);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  if (!closest) return null;

  // Normalize response format to match expected structure
  return {
    dt: closest.dt,
    temp: closest.main?.temp,
    feels_like: closest.main?.feels_like,
    weather: closest.weather?.[0],
    pop: closest.pop, // probability of precipitation
  };
}
