// Chat endpoint for voice conversation
import express from "express";
import { processConversationTurn } from "../services/conversationService.js";
import { getWeatherAndRecommendation } from "../services/weatherService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { sessionId, message, bookingData } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message required" });
    }

    // Check if this is a weather request
    if (message.toLowerCase().includes("weather") && bookingData?.bookingDate) {
      // Validate date is within 5-day window before fetching
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const bookingDateObj = new Date(bookingData.bookingDate + "T00:00:00");
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 5);

      if (bookingDateObj > maxDate || bookingDateObj < today) {
        return res.status(400).json({
          error:
            "Weather data only available for bookings within the next 5 days",
          response:
            "Sorry, I can only provide weather information for bookings within the next 5 days.",
          bookingData,
          isComplete: false,
        });
      }

      const { weatherInfo, seatingRecommendation, error } =
        await getWeatherAndRecommendation(
          bookingData.bookingDate,
          bookingData.bookingTime || "19:00",
          bookingData.location || "New Delhi"
        );

      // If weather fetch failed due to date range, return error
      if (error) {
        return res.status(400).json({
          error,
          response:
            "Sorry, weather data is not available for that date. Please choose a date within the next 5 days.",
          bookingData,
          isComplete: false,
        });
      }

      return res.json({
        response: `Weather looks ${
          weatherInfo?.condition || "unknown"
        }. Recommending ${seatingRecommendation} seating.`,
        weatherInfo,
        seatingRecommendation,
        bookingData,
        isComplete: false,
      });
    }

    // Process conversation turn with Gemini
    const result = await processConversationTurn(sessionId, message);

    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
