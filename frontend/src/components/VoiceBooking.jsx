// Voice booking component with step-based flow
import { useState, useRef, useEffect } from "react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../config/constants";
import { FaMicrophone } from "react-icons/fa";
import { STEPS } from "../utils/steps";
import {
  isSeatingIndoor,
  isSeatingOutdoor,
  userWantsToChange,
  userSpecifiesField,
  isPositive,
} from "../utils/voicePatterns";
import ConversationPane from "./ConversationPane";
import VoiceControls from "./VoiceControls";
import BookingForm from "./BookingForm";

// Steps moved to utils/steps for clarity

const STORAGE_KEY = "hotel_booking_session";

/**
 * Container component orchestrating the voice-first booking flow.
 * Manages conversation state, calls backend (Gemini + weather),
 * and coordinates UI components.
 */
export default function VoiceBooking() {
  // Load from localStorage on mount
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      console.error("Failed to load from storage:", error);
    }
    return null;
  };

  const savedData = loadFromStorage();

  const [step, setStep] = useState(savedData?.step || STEPS.IDLE);
  const [booking, setBooking] = useState(
    savedData?.booking || {
      customerName: "",
      numberOfGuests: "",
      bookingDate: "",
      bookingTime: "",
      cuisinePreference: "",
      specialRequests: "",
      seatingPreference: "",
      location: "New Delhi",
      weatherInfo: null,
    }
  );
  const [conversation, setConversation] = useState(
    savedData?.conversation || []
  );
  const [isActive, setIsActive] = useState(savedData?.isActive || false);
  const [hasAskedToContinue, setHasAskedToContinue] = useState(false);
  const [weatherRecommendationGiven, setWeatherRecommendationGiven] = useState(
    savedData?.weatherRecommendationGiven || false
  );
  const lastWeatherCheckRef = useRef(savedData?.lastWeatherCheck || null);
  const conversationEndRef = useRef(null);
  const sessionIdRef = useRef(savedData?.sessionId || `session-${Date.now()}`);
  const [showContinuePrompt, setShowContinuePrompt] = useState(
    savedData &&
      savedData.step !== STEPS.IDLE &&
      savedData.step !== STEPS.COMPLETE
  );

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isActive) {
      const dataToSave = {
        step,
        booking,
        conversation,
        isActive,
        sessionId: sessionIdRef.current,
        timestamp: Date.now(),
        weatherRecommendationGiven,
        lastWeatherCheck: lastWeatherCheckRef.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [step, booking, conversation, isActive, weatherRecommendationGiven]);

  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();
  const { startListening, stopListening, isListening } = useSpeechRecognition({
    onResult: handleUserSpeech,
    onError: (error) => {
      console.error("Speech error:", error);
      // Don't show error messages for common recognition issues
      // User can manually click Speak to try again
    },
  });

  // Add message to conversation
  const addMessage = (type, text) => {
    setConversation((prev) => [...prev, { type, text, timestamp: Date.now() }]);
    setTimeout(
      () => conversationEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  // Start booking flow (greets and begins listening)
  const startBooking = async () => {
    setIsActive(true);
    setStep(STEPS.ASK_NAME);
    setHasAskedToContinue(true);

    const greeting =
      "Hello! Welcome to our restaurant. I'm here to help you book a table. May I have your name please?";
    addMessage("bot", greeting);

    // Stop any ongoing speech and listening
    stopSpeaking();
    stopListening();

    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    await speak(greeting, () => {
      // Auto-start listening after greeting
      setTimeout(() => startListening(), 500);
    });
  };

  // Continue from saved session (localStorage)
  const continueBooking = async () => {
    setShowContinuePrompt(false);
    setIsActive(true);
    setHasAskedToContinue(true);
    await speakAndShow("Great! Let's continue where we left off.");
    setTimeout(() => startListening(), 1000);
  };

  // Start a fresh booking (clears session)
  const startFreshBooking = () => {
    setShowContinuePrompt(false);
    localStorage.removeItem(STORAGE_KEY);
    resetBooking();
    setHasAskedToContinue(true);
    startBooking();
  };

  // Handle recognized user speech transcript
  async function handleUserSpeech(transcript) {
    stopListening();
    addMessage("user", transcript);

    // Handle continue/restart question - only if we're showing the prompt
    if (showContinuePrompt && !isActive) {
      const lower = transcript.toLowerCase();
      if (/continue|yes|resume/i.test(lower)) {
        await continueBooking();
      } else if (/new|start|fresh|restart/i.test(lower)) {
        await startFreshBooking();
      } else {
        await speakAndShow(
          "Sorry, I didn't catch that. Do you want to continue your previous booking or start a new one?"
        );
        setTimeout(() => startListening(), 1000);
      }
      return;
    }

    // Quick handle for seating preference via voice
    const lower = transcript.toLowerCase();
    if (step === STEPS.FETCH_WEATHER || step === STEPS.CONFIRM_DETAILS) {
      if (/\b(indoor|inside)\b/.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "indoor" }));
        await speakAndShow("Great! Indoor seating set.");
        if (step === STEPS.FETCH_WEATHER) {
          setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        } else {
          // Re-read confirmation
          setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        }
        return;
      }
      if (/\b(outdoor|outside)\b/.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "outdoor" }));
        await speakAndShow("Perfect! Outdoor seating set.");
        if (step === STEPS.FETCH_WEATHER) {
          setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        } else {
          setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        }
        return;
      }
    }

    // Process with Gemini AI
    await processWithGemini(transcript);
  }

  // Send user message to backend (Gemini) and merge extracted fields
  async function processWithGemini(userMessage) {
    try {
      // If we're at seating confirmation (weather) or final confirmation, handle locally
      if (step === STEPS.FETCH_WEATHER || step === STEPS.CONFIRM_DETAILS) {
        await handleConfirmation(userMessage);
        return;
      }

      // Show typing indicator
      addMessage("bot", "Thinking...");

      const { data } = await apiClient.post(API_ENDPOINTS.CHAT, {
        sessionId: sessionIdRef.current,
        message: userMessage,
        bookingData: booking,
      });

      // Remove "Thinking..." message
      setConversation((prev) => prev.slice(0, -1));

      // Update booking data from Gemini's extraction
      if (data.bookingData) {
        // Validate date is not in the past and not more than 10 days in future
        if (data.bookingData.bookingDate) {
          const bookingDate = new Date(
            data.bookingData.bookingDate + "T00:00:00"
          );
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const maxDate = new Date(today);
          maxDate.setDate(maxDate.getDate() + 5);

          console.log(
            "Validating date:",
            data.bookingData.bookingDate,
            "Booking:",
            bookingDate,
            "Today:",
            today,
            "Max:",
            maxDate
          );

          if (bookingDate < today) {
            // Reject past dates - ask for valid date immediately
            console.log("REJECTING PAST DATE");
            setConversation((prev) => prev.slice(0, -1));

            // Keep the step at ASK_DATE to ask again
            setStep(STEPS.ASK_DATE);
            await speakAndShow(
              `Sorry, that date has passed. Please choose today (${today.toLocaleDateString(
                "en-IN"
              )}) or a future date within the next 5 days.`
            );
            return;
          }

          if (bookingDate > maxDate) {
            // Reject dates more than 5 days in future - ask for valid date immediately
            console.log("REJECTING DATE TOO FAR IN FUTURE");
            setConversation((prev) => prev.slice(0, -1));

            // Keep the step at ASK_DATE to ask again
            setStep(STEPS.ASK_DATE);
            await speakAndShow(
              `I can only book within the next 5 days. Our weather data is limited. Please choose a date between ${today.toLocaleDateString(
                "en-IN"
              )} and ${maxDate.toLocaleDateString("en-IN")}.`
            );
            return;
          }

          // If booking is for today, validate time is not in the past
          if (
            data.bookingData.bookingTime &&
            bookingDate.getTime() === today.getTime()
          ) {
            const [hours, minutes] = data.bookingData.bookingTime
              .split(":")
              .map(Number);
            const bookingDateTime = new Date();
            bookingDateTime.setHours(hours, minutes, 0, 0);
            const now = new Date();

            if (bookingDateTime <= now) {
              setConversation((prev) => prev.slice(0, -1));
              setBooking((prev) => ({ ...prev, bookingTime: "" }));

              // Show current time in IST for reference
              const currentIST = new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Kolkata",
              });
              await speakAndShow(
                `For today's bookings, please choose a time after ${currentIST}. What time works for you?`
              );
              return;
            }
          }
        }

        const updatedBooking = {
          ...booking,
          ...data.bookingData,
        };

        // Check if date or time changed
        const dateOrTimeChanged =
          (data.bookingData.bookingDate &&
            data.bookingData.bookingDate !== booking.bookingDate) ||
          (data.bookingData.bookingTime &&
            data.bookingData.bookingTime !== booking.bookingTime);

        if (dateOrTimeChanged) {
          setWeatherRecommendationGiven(false);
          lastWeatherCheckRef.current = null;
        }

        setBooking(updatedBooking);

        // Speak response first
        if (data.response) {
          await speakAndShow(data.response);
        }

        // Check if ALL info is complete (including cuisine and special requests)
        const allFieldsComplete =
          updatedBooking.customerName &&
          updatedBooking.numberOfGuests &&
          updatedBooking.bookingDate &&
          updatedBooking.bookingTime &&
          updatedBooking.cuisinePreference &&
          updatedBooking.specialRequests;

        if (allFieldsComplete) {
          // Only fetch weather if not already done or if date/time changed
          if (!weatherRecommendationGiven || dateOrTimeChanged) {
            await fetchWeatherAndRespond();
          } else {
            // Go straight to confirmation
            await moveTo(STEPS.CONFIRM_DETAILS);
          }
          return;
        }

        return;
      }

      // Speak bot's response
      if (data.response) {
        await speakAndShow(data.response);
      }
    } catch (error) {
      console.error("Gemini processing error:", error);
      // Remove thinking message if exists
      setConversation((prev) =>
        prev[prev.length - 1]?.text === "Thinking..." ? prev.slice(0, -1) : prev
      );
      addMessage(
        "error",
        "Sorry, I had trouble processing that. Please try again or edit manually."
      );
      // Restart listening after error
      setTimeout(() => startListening(), 1000);
    }
  }

  // Move state machine to next step
  async function moveTo(nextStep) {
    setStep(nextStep);

    switch (nextStep) {
      case STEPS.FETCH_WEATHER:
        await fetchWeatherAndRespond();
        break;

      case STEPS.CONFIRM_DETAILS: {
        const details = [
          `Name: ${booking.customerName}`,
          `Guests: ${booking.numberOfGuests}`,
          `Date: ${booking.bookingDate}`,
          `Time: ${booking.bookingTime}`,
          booking.cuisinePreference
            ? `Cuisine: ${booking.cuisinePreference}`
            : null,
          booking.specialRequests
            ? `Special Requests: ${booking.specialRequests}`
            : null,
          `Seating: ${booking.seatingPreference || "indoor"}`,
        ]
          .filter(Boolean)
          .join(", ");

        const confirmation = `Perfect! Let me confirm your reservation. ${details}. Would you like to change anything, or shall I proceed with this booking?`;
        await speakAndShow(confirmation);
        break;
      }

      case STEPS.SAVE_BOOKING:
        await saveBookingToServer();
        break;

      default:
        break;
    }
  }

  // Fetch weather forecast and suggest seating
  async function fetchWeatherAndRespond() {
    try {
      setStep(STEPS.FETCH_WEATHER);

      // Speak without auto-listening
      addMessage("bot", "Let me check the weather for your booking date.");
      await speak("Let me check the weather for your booking date.");

      const { data } = await apiClient.post(API_ENDPOINTS.CHAT, {
        sessionId: sessionIdRef.current,
        message: `Get weather for ${booking.bookingDate} at ${booking.bookingTime}`,
        bookingData: booking,
      });

      const recommendedSeating = data.seatingRecommendation || "indoor";
      const weatherMessage = data.weatherInfo
        ? `The weather looks ${data.weatherInfo.condition.toLowerCase()}, around ${
            data.weatherInfo.temperature
          }°C. I recommend ${recommendedSeating} seating for your comfort. Would you like to go with ${recommendedSeating} seating, or would you prefer something different?`
        : "Weather data is not available at the moment. For safety reasons, I recommend indoor seating. Would you prefer indoor or outdoor seating?";

      // Store recommendation but don't override user choice
      setBooking((prev) => ({
        ...prev,
        weatherInfo: data.weatherInfo,
        seatingPreference: prev.seatingPreference || recommendedSeating,
      }));

      setWeatherRecommendationGiven(true);
      lastWeatherCheckRef.current = {
        date: booking.bookingDate,
        time: booking.bookingTime,
      };

      // Stay in FETCH_WEATHER step to wait for seating confirmation
      addMessage("bot", weatherMessage);
      await speak(weatherMessage, () => {
        // Start listening after weather message
        setTimeout(() => startListening(), 500);
      });
    } catch (error) {
      console.error("Weather fetch error:", error);
      await speakAndShow(
        "Could not fetch weather information. I'll recommend indoor seating."
      );
      setBooking((prev) => ({ ...prev, seatingPreference: "indoor" }));
      setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 2000);
    }
  }

  // Save completed booking to backend (MongoDB)
  async function saveBookingToServer() {
    try {
      setStep(STEPS.SAVE_BOOKING);
      stopListening(); // Stop mic immediately
      await speakAndShow("Perfect! Let me save your booking...");

      const { data } = await apiClient.post(API_ENDPOINTS.BOOKINGS, booking);

      setStep(STEPS.COMPLETE);
      stopListening(); // Ensure mic is stopped

      // Spell booking ID letter by letter with spaces
      const bookingIdSpelled = data.bookingId.split("").join(" ");
      const completionMessage = `Wonderful! Your table has been successfully booked. Your booking ID is ${bookingIdSpelled}. We look forward to serving you. Have a great day!`;

      addMessage(
        "bot",
        `Wonderful! Your table has been successfully booked. Your booking ID is ${data.bookingId}. We look forward to serving you. Have a great day!`
      );

      // Stop any ongoing speech and listening
      stopSpeaking();
      stopListening();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Speak without callback to prevent auto-listening
      await speak(completionMessage);

      setTimeout(() => resetBooking(), 5000);
    } catch (error) {
      console.error("Save booking error:", error);
      addMessage(
        "error",
        "Sorry, there was an error saving your booking. Please try again or contact us directly."
      );
      await speakAndShow(
        "I apologize, but there was an error saving your booking. Please try again."
      );
      setTimeout(() => setStep(STEPS.CONFIRM_DETAILS), 2000);
    }
  }

  // Speaks a bot message and shows it in the conversation
  async function speakAndShow(text) {
    addMessage("bot", text);

    // Stop any ongoing speech and listening
    stopSpeaking();
    stopListening();

    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    await speak(text, () => {
      // After bot finishes speaking, listen for user response
      // Auto-start listening for all conversation steps except complete/idle/save/weather
      const currentStep = step; // Capture current step
      if (
        currentStep !== STEPS.FETCH_WEATHER &&
        currentStep !== STEPS.SAVE_BOOKING &&
        currentStep !== STEPS.COMPLETE &&
        currentStep !== STEPS.IDLE &&
        isActive
      ) {
        setTimeout(() => startListening(), 500);
      }
    });
  }

  // Reset all state and end the current session
  function resetBooking() {
    localStorage.removeItem(STORAGE_KEY);
    setStep(STEPS.IDLE);
    setBooking({
      customerName: "",
      numberOfGuests: "",
      bookingDate: "",
      bookingTime: "",
      cuisinePreference: "",
      specialRequests: "",
      seatingPreference: "",
      location: "New Delhi",
      weatherInfo: null,
    });
    setConversation([]);
    setIsActive(false);
    setHasAskedToContinue(false);
    setShowContinuePrompt(false);
    setWeatherRecommendationGiven(false);
    lastWeatherCheckRef.current = null;
    sessionIdRef.current = `session-${Date.now()}`;
    stopListening();
    stopSpeaking();
  }

  // Manual form field edit handler
  const handleFieldChange = (field, value) => {
    setBooking((prev) => ({ ...prev, [field]: value }));
  };

  // Handles seating confirmation and final booking confirmation
  async function handleConfirmation(userMessage) {
    const lower = userMessage.toLowerCase();

    // If we're waiting for seating preference confirmation after weather check
    if (step === STEPS.FETCH_WEATHER) {
      if (isSeatingIndoor(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "indoor" }));
        await speakAndShow("Great! Indoor seating it is.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 1000);
      } else if (isSeatingOutdoor(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "outdoor" }));
        await speakAndShow("Perfect! Outdoor seating reserved for you.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 1000);
      } else if (isPositive(lower)) {
        await speakAndShow("Excellent choice!");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 1000);
      } else {
        await speakAndShow(
          "I didn't catch that. Would you prefer indoor or outdoor seating?"
        );
        setTimeout(() => startListening(), 1000);
      }
      return;
    }

    // Regular confirmation at final step
    const wantsToChange = userWantsToChange(lower);
    const positive = isPositive(lower);

    if (wantsToChange) {
      // Direct seating change without Gemini
      if (/\b(indoor|inside)\b/.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "indoor" }));
        await speakAndShow("Done. Indoor seating set.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        return;
      }
      if (/\b(outdoor|outside)\b/.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "outdoor" }));
        await speakAndShow("Done. Outdoor seating set.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 800);
        return;
      }

      await speakAndShow("No problem! What would you like to change?");

      // Enter conversation mode for field changes
      setStep(STEPS.ASK_NAME);
      setWeatherRecommendationGiven(false);

      // If message specifies the change (e.g., "change date to tomorrow") let Gemini extract
      if (/(date|time|guest|guests|name|cuisine|special)/i.test(lower)) {
        setTimeout(() => processWithGemini(userMessage), 600);
      } else {
        setTimeout(() => startListening(), 600);
      }
    } else if (positive) {
      await moveTo(STEPS.SAVE_BOOKING);
    } else {
      await speakAndShow(
        "I didn't catch that. Should I proceed with the booking, or would you like to change something?"
      );
      setTimeout(() => startListening(), 1000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Restaurant Booking
          </h1>
          <p className="text-gray-600">
            Complete your reservation with voice or manual input
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 ">
          {/* Left Column - Voice Assistant */}
          <div>
            <ConversationPane
              conversation={conversation}
              isSpeaking={isSpeaking}
              isListening={isListening}
              endRef={conversationEndRef}
            />
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
              <VoiceControls
                showContinuePrompt={showContinuePrompt}
                isActive={isActive}
                isListening={isListening}
                onContinue={continueBooking}
                onStartNew={startFreshBooking}
                onStart={startBooking}
                onToggleListen={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                onCancel={resetBooking}
                onStopSpeaking={stopSpeaking}
              />
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <BookingForm
            isActive={isActive}
            booking={booking}
            onFieldChange={handleFieldChange}
            step={step}
            onConfirm={moveTo}
          />
        </div>
      </div>
    </div>
  );
}
