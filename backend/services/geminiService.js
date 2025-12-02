// services/geminiService.js
// Format natural language user input into structured booking data

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

/**
 * Parse natural language booking request into structured data
 * @param {string} userInput - Natural language booking request
 * @returns {object} Structured booking data matching schema
 */
export async function formatBookingInput(userInput) {
  const prompt = `You are a restaurant booking assistant. Extract structured booking information from the user's message.

User message: "${userInput}"

Extract and return ONLY a valid JSON object with these fields (use null if not mentioned):
{
  "customerName": "string",
  "numberOfGuests": number (default 1),
  "bookingDate": "YYYY-MM-DD format",
  "bookingTime": "HH:MM in 24h format",
  "cuisinePreference": "Italian|Chinese|Indian|Mexican|French|Mediterranean|Thai|Other or null",
  "specialRequests": "string or null",
  "seatingPreference": "indoor|outdoor or null",
  "location": "city name or null (defaults to New Delhi)"
}

Important:
- Convert relative dates like "tomorrow", "next Friday" to YYYY-MM-DD (assume today is ${new Date().toISOString().split('T')[0]})
- Convert times like "7pm", "dinner time" to 24h format (19:00 for 7pm, 19:30 for dinner)
- Return ONLY the JSON object, no markdown, no explanations`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    const text = result.text.trim();
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(jsonText);
    
    // Clean up and validate
    return {
      customerName: parsed.customerName || null,
      numberOfGuests: parsed.numberOfGuests || 1,
      bookingDate: parsed.bookingDate || null,
      bookingTime: parsed.bookingTime || null,
      cuisinePreference: parsed.cuisinePreference || null,
      specialRequests: parsed.specialRequests || 'No special requests',
      seatingPreference: parsed.seatingPreference || null,
      location: parsed.location || 'New Delhi',
    };
  } catch (err) {
    console.error('Gemini formatting error:', err.message);
    throw new Error('Failed to parse booking request. Please provide clearer details.');
  }
}
