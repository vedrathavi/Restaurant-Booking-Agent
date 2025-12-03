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

  const todayDate = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 86400000)
    .toISOString()
    .split("T")[0];
  const dayAfterTomorrowDate = new Date(Date.now() + 172800000)
    .toISOString()
    .split("T")[0];
  const maxDate = new Date(Date.now() + 5 * 86400000)
    .toISOString()
    .split("T")[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  const prompt = `Extract booking details from conversation. Return ONLY JSON.

CURRENT DATA:
${JSON.stringify(currentData, null, 2)}

LAST 4 MESSAGES:
${history
  .slice(-4)
  .map((h) => `${h.role}: ${h.message}`)
  .join("\n")}

DATES (USE THESE EXACT VALUES):
TODAY = ${todayDate}
TOMORROW = ${tomorrowDate}
DAY AFTER TOMORROW = ${dayAfterTomorrowDate}
MAX ALLOWED = ${maxDate}
CURRENT TIME = ${currentTime}

EXTRACTION RULES:
1. NAME: ANY name → customerName
   - "John" → "John"
   - "My name is Sarah" → "Sarah"
   - "Mr. Smith" → "Mr. Smith"

2. GUESTS: ANY number → numberOfGuests
   - "4" → 4
   - "twelve" → 12
   - "six people" → 6
   - "for 3" → 3
   - SINGLE NUMBER RESPONSE = numberOfGuests

3. DATE: 
   - "today" → ${todayDate}
   - "tomorrow" → ${tomorrowDate}  
   - "day after tomorrow" → ${dayAfterTomorrowDate}
   - Before ${todayDate} → null (REJECT - past date)
   - After ${maxDate} (5 days from today) → null (REJECT - too far)

4. TIME: Convert to 24h (New Delhi timezone)
   - "7pm" / "7 pm" / "19:00" → "19:00"
   - "lunch" → "12:30"
   - "dinner" → "19:30"
   - "breakfast" → "09:00"
   - "same time" (if first time booking) → current time in IST

5. CUISINE: Italian|Chinese|Indian|Mexican|French|Mediterranean|Thai|Japanese|Korean|American|Continental|Other

6. SPECIAL REQUESTS: Extract any mentions or "None"

CRITICAL - READ THIS:
- If last assistant message asked "How many guests?" and user says "4", EXTRACT 4 as numberOfGuests
- If last assistant message asked "What name?" and user says "John", EXTRACT "John" as customerName
- ALWAYS extract the answer to the most recent question
- Single word/number responses answer the previous question
- If date is invalid (past or >5 days from today), return null and we'll ask again IMMEDIATELY
- "same time" on first booking = extract current IST time
- MAXIMUM booking window: 5 days from today ONLY

Return JSON with ONLY fields mentioned in last message:
{"customerName": "value or null", "numberOfGuests": number or null, "bookingDate": "YYYY-MM-DD or null", "bookingTime": "HH:MM or null", "cuisinePreference": "value or null", "specialRequests": "value or null"}

Empty response if nothing new: {}`;

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
  const optionalFields = getOptionalMissingFields(bookingData);

  // Check if user is trying to modify something
  const isModifying =
    /change|edit|modify|update|different|instead|actually/i.test(userMessage);

  // Check if user specified WHAT to change (contains specific field mentions)
  const specifiesWhatToChange =
    /date|time|guest|guests|name|cuisine|seating|indoor|outdoor|special request/i.test(
      userMessage
    );

  // Check if we've already asked "what to change" in recent history (last 6 messages)
  const recentMessages = history.slice(-6).map((h) => h.message.toLowerCase());
  const alreadyAskedWhatToChange = recentMessages.some((msg) =>
    /what.*change|which.*change|what.*like.*change|which.*modify/.test(msg)
  );

  // Get filled fields to acknowledge
  const filledFields = [];
  if (bookingData.customerName)
    filledFields.push(`name (${bookingData.customerName})`);
  if (bookingData.numberOfGuests)
    filledFields.push(`${bookingData.numberOfGuests} guests`);
  if (bookingData.bookingDate)
    filledFields.push(`date (${bookingData.bookingDate})`);
  if (bookingData.bookingTime)
    filledFields.push(`time (${bookingData.bookingTime})`);
  if (bookingData.cuisinePreference)
    filledFields.push(`${bookingData.cuisinePreference} cuisine`);
  if (bookingData.specialRequests) filledFields.push(`special requests`);

  const contextPrompt = `You are a casual restaurant booking assistant. ONE SHORT sentence only (max 10 words).

FILLED: ${filledFields.join(", ") || "Nothing"}
NEED: ${
    isComplete && optionalFields.length === 0
      ? "All done!"
      : isComplete
      ? optionalFields.join(", ")
      : missingFields.join(", ")
  }

LAST 3 EXCHANGES:
${history
  .slice(-3)
  .map((h) => `${h.role}: ${h.message}`)
  .join("\n")}
User just said: "${userMessage}"

CRITICAL ANTI-LOOP RULES:
- If you JUST asked for name and user answered, DON'T ask for name again
- If you JUST asked for guests and user answered, DON'T ask for guests again
- If you JUST asked for date and user gave VALID date, DON'T ask for date again
- If you JUST asked for date and user gave INVALID date (rejected), ask for valid date IMMEDIATELY
- If you JUST asked for time and user answered, DON'T ask for time again
- Check the last assistant message - if it asked for something, MOVE ON to next field UNLESS date was invalid
- NEVER repeat the same question twice in a row UNLESS we're correcting invalid input

RESPONSE LOGIC:
${
  isModifying && specifiesWhatToChange
    ? 'Say: "Sure!"'
    : isModifying && alreadyAskedWhatToChange
    ? 'Say: "Ready, go ahead"'
    : isModifying
    ? 'Ask: "What to change?"'
    : missingFields.includes("customerName")
    ? 'Acknowledge and ask: "Great! What name for the reservation?"'
    : missingFields.includes("numberOfGuests")
    ? 'Acknowledge and ask: "Awesome! How many guests?"'
    : missingFields.includes("bookingDate")
    ? 'Acknowledge and ask: "Perfect! What date? (Within next 5 days)"'
    : missingFields.includes("bookingTime")
    ? 'Acknowledge and ask: "Nice! What time?"'
    : optionalFields.includes("cuisinePreference")
    ? 'Ask: "What cuisine do you prefer?"'
    : optionalFields.includes("specialRequests")
    ? 'Ask: "Any special requests or occasions?"'
    : 'Say: "Perfect! All set."'
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
 * Check if all required fields are present (optional fields asked separately)
 */
function isBookingComplete(data) {
  const hasRequired = !!(
    data.customerName &&
    data.numberOfGuests &&
    data.bookingDate &&
    data.bookingTime
  );

  // Return true only if required fields are filled
  // Optional fields (cuisine, special requests) will be asked after
  return hasRequired;
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
 * Get list of missing optional fields
 */
function getOptionalMissingFields(data) {
  const optional = [];
  if (!data.cuisinePreference) optional.push("cuisinePreference");
  if (!data.specialRequests) optional.push("specialRequests");
  return optional;
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
