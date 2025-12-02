// services/weatherService.js
// Main orchestrator: fetch forecast, find closest entry, recommend seating

import {
  fetchWeatherForecast,
  findClosestForecast,
} from "../utils/weatherAPI.js";
import { recommendSeating } from "../utils/seatingRecommendation.js";

/**
 * Get weather info and seating recommendation for a booking.
 * @param {string} bookingDate - "YYYY-MM-DD"
 * @param {string} bookingTime - "HH:MM" (24h)
 * @param {string} city - city name (defaults to Delhi)
 * @returns {object} { weatherInfo, seatingRecommendation }
 */
export async function getWeatherAndRecommendation(
  bookingDate,
  bookingTime,
  city = "New Delhi"
) {
  try {
    // 1. Fetch forecast from OpenWeatherMap
    const apiResponse = await fetchWeatherForecast(city, bookingDate);

    // 2. Find forecast closest to booking date+time
    const forecast = findClosestForecast(apiResponse, bookingDate, bookingTime);

    if (!forecast) {
      return {
        weatherInfo: null,
        seatingRecommendation: "indoor", // safe default
      };
    }

    // 3. Extract relevant fields
    const weatherInfo = {
      dateTime: `${bookingDate} ${bookingTime}`,
      condition: forecast.weather?.main || "Unknown",
      temperature: Math.round(forecast.temp),
      description: forecast.weather?.description || "",
      rainProbability: forecast.pop ? Math.round(forecast.pop * 100) : null,
    };

    // 4. Decide seating recommendation
    const seatingRecommendation = recommendSeating(forecast);

    return { weatherInfo, seatingRecommendation };
  } catch (err) {
    console.error("Weather service error:", err.message);
    // Graceful fallback
    return {
      weatherInfo: null,
      seatingRecommendation: "indoor",
    };
  }
}
