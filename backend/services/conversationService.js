// services/conversationService.js
// Manage multi-turn voice conversations and build booking data incrementally

import { GoogleGenAI } from "@google/genai";
import { generateVoiceResponse } from "./geminiVoiceService.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory conversation store (use Redis/DB in production)
const conversations = new Map();

/**
 * Process a voice message in an ongoing conversation
 * @param {string} sessionId - Unique conversation identifier
 * @param {string} userMessage - Current user voice input
 * @returns {object} { response, bookingData, isComplete }
 */
export async function processConversationTurn(sessionId, userMessage) {
  // Get or create conversation context
  let conversation = conversations.get(sessionId);
  if (!conversation) {
    conversation = {
      history: [],
      bookingData: {
        customerName: null,
        numberOfGuests: null,
        bookingDate: null,
        bookingTime: null,
        cuisinePreference: null,
        specialRequests: null,
        seatingPreference: null,
        location: "New Delhi",
      },
      createdAt: Date.now(),
    };
    conversations.set(sessionId, conversation);
  }

  // Add user message to history
  conversation.history.push({ role: "user", message: userMessage });

  try {
    // Extract and update booking information from conversation
    const updatedData = await extractBookingInfo(
      conversation.history,
      conversation.bookingData
    );
    conversation.bookingData = { ...conversation.bookingData, ...updatedData };

    // Check if booking is complete
    const isComplete = isBookingComplete(conversation.bookingData);

    // Generate appropriate response
    const response = await generateContextualResponse(
      userMessage,
      conversation.bookingData,
      isComplete,
      conversation.history
    );

    // Add assistant response to history
    conversation.history.push({ role: "assistant", message: response });

    return {
      response,
      bookingData: conversation.bookingData,
      isComplete,
      missingFields: getMissingFields(conversation.bookingData),
    };
  } catch (err) {
    console.error("Conversation error:", err.message);
    return {
      response: "I'm sorry, could you repeat that?",
      bookingData: conversation.bookingData,
      isComplete: false,
      missingFields: getMissingFields(conversation.bookingData),
    };
  }
}

/**
 * Extract booking information from conversation history
 */
async function extractBookingInfo(history, currentData) {
  const model = ai.models;

  const conversationText = history
    .map((h) => `${h.role}: ${h.message}`)
    .join("\n");

  const prompt = `Extract booking information from this conversation. Return ONLY a JSON object with updated fields (use null for missing data).

Current booking data:
${JSON.stringify(currentData, null, 2)}

Conversation:
${conversationText}

Extract and return ONLY updated fields as JSON (today is ${
    new Date().toISOString().split("T")[0]
  }):
{
  "customerName": "string or null",
  "numberOfGuests": number or null,
  "bookingDate": "YYYY-MM-DD or null",
  "bookingTime": "HH:MM (24h) or null",
  "cuisinePreference": "Italian|Chinese|Indian|Mexican|French|Mediterranean|Thai|Other or null",
  "specialRequests": "string or null",
  "seatingPreference": "indoor|outdoor or null",
  "location": "city name or null"
}

Rules:
- Convert relative dates (tomorrow, next Friday, etc.)
- Convert times (7pm → 19:00, dinner → 19:30)
- Only return fields that were mentioned or updated
- Return empty object {} if nothing new mentioned`;

  try {
    const result = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = result.text
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(text);

    // Only return non-null updates
    return Object.fromEntries(
      Object.entries(parsed).filter(([_, v]) => v !== null && v !== undefined)
    );
  } catch (err) {
    console.error("Extract error:", err.message);
    return {};
  }
}

/**
 * Generate contextual response based on conversation state
 */
async function generateContextualResponse(
  userMessage,
  bookingData,
  isComplete,
  history
) {
  const missingFields = getMissingFields(bookingData);

  const contextPrompt = `You are a friendly restaurant booking assistant in a voice conversation.

Current booking data:
${JSON.stringify(bookingData, null, 2)}

${
  isComplete
    ? "All required information collected!"
    : `Still need: ${missingFields.join(", ")}`
}

Recent conversation:
${history
  .slice(-4)
  .map((h) => `${h.role}: ${h.message}`)
  .join("\n")}

User just said: "${userMessage}"

Generate a SHORT (1-2 sentences) natural response:
${
  isComplete
    ? "- Confirm the complete booking details warmly"
    : "- Ask for ONE missing piece of information naturally\n- Be conversational, not robotic"
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contextPrompt,
    });
    return result.text.trim();
  } catch (err) {
    console.error("Response generation error:", err.message);

    if (!isComplete && missingFields.length > 0) {
      const field = missingFields[0];
      const prompts = {
        customerName: "Great! What name should I put the reservation under?",
        numberOfGuests: "How many people will be joining?",
        bookingDate: "What day would you like to book?",
        bookingTime: "What time works best for you?",
      };
      return prompts[field] || `Could you tell me your ${field}?`;
    }
    return "Perfect! Let me confirm your booking details.";
  }
}

/**
 * Check if all required fields are present
 */
function isBookingComplete(data) {
  return !!(
    data.customerName &&
    data.numberOfGuests &&
    data.bookingDate &&
    data.bookingTime
  );
}

/**
 * Get list of missing required fields
 */
function getMissingFields(data) {
  const required = [
    "customerName",
    "numberOfGuests",
    "bookingDate",
    "bookingTime",
  ];
  return required.filter((field) => !data[field]);
}

/**
 * Clear conversation history (call after booking confirmed)
 */
export function clearConversation(sessionId) {
  conversations.delete(sessionId);
}

/**
 * Get current conversation state
 */
export function getConversation(sessionId) {
  return conversations.get(sessionId);
}
