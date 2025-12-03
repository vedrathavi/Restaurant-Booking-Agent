// services/geminiVoiceService.js
// Generates natural, human-like responses for voice chat interactions.
// Optional: The main flow uses concise contextual responses; this module
// can be used when richer voice output is desired.

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate natural conversation response for voice chat
 * @param {string} userMessage - User's voice input/question
 * @param {object} context - Optional booking context for personalized responses
 * @returns {string} Human-like response suitable for voice output
 */
export async function generateVoiceResponse(userMessage, context = {}) {
  const systemContext = `You are a friendly, helpful restaurant booking assistant speaking naturally in a voice conversation. 

Guidelines:
- Keep responses SHORT and conversational (1-3 sentences max)
- Sound warm and human-like, not robotic
- Ask clarifying questions if needed
- Confirm details clearly
- Use casual, natural language suitable for voice chat
- Avoid technical jargon or overly formal language

${
  context.bookingData
    ? `Current booking details: ${JSON.stringify(context.bookingData)}`
    : ""
}
${
  context.weatherInfo
    ? `Weather: ${context.weatherInfo.condition}, ${context.weatherInfo.temperature}°C`
    : ""
}
${
  context.seatingRecommendation
    ? `Recommended seating: ${context.seatingRecommendation}`
    : ""
}`;

  const prompt = `${systemContext}

User says: "${userMessage}"

Respond naturally as a voice assistant:`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return result.text.trim();
  } catch (err) {
    console.error("Gemini voice response error:", err.message);
    return "I'm sorry, I didn't quite catch that. Could you repeat?";
  }
}

/**
 * Generate booking confirmation message
 * @param {object} booking - Complete booking object
 * @param {object} weatherInfo - Weather data
 * @returns {string} Friendly confirmation message
 */
export async function generateConfirmationMessage(booking, weatherInfo = null) {
  const prompt = `Generate a warm, friendly booking confirmation message for voice output (2-3 sentences).

Booking details:
- Customer: ${booking.customerName}
- Date: ${booking.bookingDate}
- Time: ${booking.bookingTime}
- Guests: ${booking.numberOfGuests}
- Seating: ${booking.seatingPreference || "not specified"}
- Booking ID: ${booking.bookingId}
${
  weatherInfo
    ? `- Weather: ${weatherInfo.condition}, ${weatherInfo.temperature}°C`
    : ""
}

Keep it natural, mention the booking ID, and wish them a great time.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return result.text.trim();
  } catch (err) {
    console.error("Gemini confirmation error:", err.message);
    return `Great! Your booking for ${booking.numberOfGuests} guests on ${booking.bookingDate} at ${booking.bookingTime} is confirmed. Your booking ID is ${booking.bookingId}. Looking forward to seeing you!`;
  }
}
