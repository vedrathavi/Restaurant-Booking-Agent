// Voice booking component with step-based flow
import { useState, useRef, useEffect } from "react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import apiClient from "../utils/apiClient";
import { API_ENDPOINTS } from "../config/constants";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPlay,
  FaStop,
  FaRedo,
  FaCheck,
  FaEdit,
  FaCalendar,
  FaClock,
  FaUsers,
  FaUtensils,
  FaSun,
  FaMoon,
} from "react-icons/fa";

const STEPS = {
  IDLE: "IDLE",
  ASK_NAME: "ASK_NAME",
  ASK_GUESTS: "ASK_GUESTS",
  ASK_DATE: "ASK_DATE",
  ASK_TIME: "ASK_TIME",
  ASK_CUISINE: "ASK_CUISINE",
  ASK_SPECIAL_REQUEST: "ASK_SPECIAL_REQUEST",
  FETCH_WEATHER: "FETCH_WEATHER",
  CONFIRM_DETAILS: "CONFIRM_DETAILS",
  SAVE_BOOKING: "SAVE_BOOKING",
  COMPLETE: "COMPLETE",
};

const STORAGE_KEY = "hotel_booking_session";

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

  // Start booking flow
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

  // Continue from saved state
  const continueBooking = async () => {
    setShowContinuePrompt(false);
    setIsActive(true);
    setHasAskedToContinue(true);
    await speakAndShow("Great! Let's continue where we left off.");
    setTimeout(() => startListening(), 1000);
  };

  // Start fresh booking
  const startFreshBooking = () => {
    setShowContinuePrompt(false);
    localStorage.removeItem(STORAGE_KEY);
    resetBooking();
    setHasAskedToContinue(true);
    startBooking();
  };

  // Handle user speech input
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

    // Process with Gemini AI
    await processWithGemini(transcript);
  }

  // Process conversation with Gemini AI
  async function processWithGemini(userMessage) {
    try {
      // If we're at confirmation step, handle separately
      if (step === STEPS.CONFIRM_DETAILS) {
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

  // Move to next step (used for manual confirmation)
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

  // Fetch weather and suggest seating
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

  // Save booking to backend
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

  // Speak and display message
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

  // Reset booking state
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

  // Handle manual edit of booking fields
  const handleFieldChange = (field, value) => {
    setBooking((prev) => ({ ...prev, [field]: value }));
  };

  // Handle confirmation response
  async function handleConfirmation(userMessage) {
    const lower = userMessage.toLowerCase();

    // If we're waiting for seating preference confirmation after weather check
    if (step === STEPS.FETCH_WEATHER) {
      if (/indoor/i.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "indoor" }));
        await speakAndShow("Great! Indoor seating it is.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 1000);
      } else if (/outdoor/i.test(lower)) {
        setBooking((prev) => ({ ...prev, seatingPreference: "outdoor" }));
        await speakAndShow("Perfect! Outdoor seating reserved for you.");
        setTimeout(() => moveTo(STEPS.CONFIRM_DETAILS), 1000);
      } else if (
        /yes|yeah|sure|ok|okay|sounds good|that's fine|go with it|stick/i.test(
          lower
        )
      ) {
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
    const wantsToChange =
      /change|edit|modify|update|different|no|wait|actually/i.test(lower);
    const isPositive =
      /yes|yeah|sure|confirm|proceed|ok|okay|correct|right|perfect|good|looks good/i.test(
        lower
      );

    if (wantsToChange) {
      await speakAndShow(
        "No problem! What would you like to change? You can tell me or edit the fields manually below."
      );

      // Process the change request with Gemini
      setStep(STEPS.ASK_GUESTS); // Go back to conversation mode
      setWeatherRecommendationGiven(false); // Reset if they want to change

      // If they mentioned what to change, process it
      if (
        lower.includes("indoor") ||
        lower.includes("outdoor") ||
        lower.includes("date") ||
        lower.includes("time") ||
        lower.includes("guests") ||
        lower.includes("cuisine")
      ) {
        setTimeout(() => processWithGemini(userMessage), 1000);
      } else {
        setTimeout(() => startListening(), 1000);
      }
    } else if (isPositive) {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Voice Assistant */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Voice Assistant
              </h2>
              {isSpeaking && (
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  <FaPlay className="animate-pulse" /> Speaking
                </span>
              )}
              {isListening && (
                <span className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  <FaMicrophone className="animate-pulse" /> Listening
                </span>
              )}
            </div>

            {/* Conversation */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 h-96 overflow-y-auto border border-gray-200">
              {conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FaMicrophone className="text-6xl mb-4" />
                  <p className="text-center">
                    Start booking to begin conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.type === "user"
                            ? "bg-blue-600 text-white"
                            : msg.type === "bot"
                            ? "bg-white border border-gray-200 text-gray-800 shadow-sm"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.type === "user"
                            ? "You"
                            : msg.type === "bot"
                            ? "Assistant"
                            : "Error"}
                        </p>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
              {showContinuePrompt && !isActive ? (
                <>
                  <button
                    onClick={continueBooking}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold shadow-lg"
                  >
                    <FaPlay /> Continue Previous
                  </button>
                  <button
                    onClick={startFreshBooking}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg"
                  >
                    <FaRedo /> Start New
                  </button>
                </>
              ) : !isActive ? (
                <button
                  onClick={startBooking}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg text-lg"
                >
                  <FaMicrophone /> Start Voice Booking
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      stopSpeaking();
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${
                      isListening
                        ? "bg-orange-600 hover:bg-orange-700"
                        : "bg-green-600 hover:bg-green-700"
                    } text-white rounded-xl transition font-semibold shadow-lg`}
                  >
                    {isListening ? (
                      <>
                        <FaMicrophoneSlash /> Stop
                      </>
                    ) : (
                      <>
                        <FaMicrophone /> Speak
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetBooking}
                    className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold shadow-lg flex items-center gap-2"
                  >
                    <FaStop /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Booking Details
              </h2>
              {isActive && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Active
                </span>
              )}
            </div>

            {!isActive ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <FaEdit className="text-6xl mb-4" />
                <p className="text-center">
                  Start a booking to fill in details
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {/* Name */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FaEdit className="text-blue-600" /> Name
                  </label>
                  <input
                    type="text"
                    value={booking.customerName}
                    onChange={(e) =>
                      handleFieldChange("customerName", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Number of Guests */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FaUsers className="text-blue-600" /> Number of Guests
                  </label>
                  <input
                    type="number"
                    value={booking.numberOfGuests}
                    onChange={(e) =>
                      handleFieldChange("numberOfGuests", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="How many guests?"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FaCalendar className="text-blue-600" /> Date
                    </label>
                    <input
                      type="date"
                      value={booking.bookingDate}
                      onChange={(e) =>
                        handleFieldChange("bookingDate", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FaClock className="text-blue-600" /> Time
                    </label>
                    <input
                      type="time"
                      value={booking.bookingTime}
                      onChange={(e) =>
                        handleFieldChange("bookingTime", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Cuisine Preference */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FaUtensils className="text-blue-600" /> Cuisine Preference
                  </label>
                  <input
                    type="text"
                    value={booking.cuisinePreference}
                    onChange={(e) =>
                      handleFieldChange("cuisinePreference", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Italian, Chinese"
                  />
                </div>

                {/* Seating Preference */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    {booking.seatingPreference === "outdoor" ? (
                      <FaSun className="text-yellow-600" />
                    ) : (
                      <FaMoon className="text-indigo-600" />
                    )}
                    Seating Preference
                  </label>
                  <select
                    value={booking.seatingPreference}
                    onChange={(e) =>
                      handleFieldChange("seatingPreference", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Auto (based on weather)</option>
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                  </select>
                </div>

                {/* Special Requests */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <FaEdit className="text-blue-600" /> Special Requests
                  </label>
                  <textarea
                    value={booking.specialRequests}
                    onChange={(e) =>
                      handleFieldChange("specialRequests", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="3"
                    placeholder="Birthday, anniversary, dietary restrictions, etc."
                  />
                </div>

                {/* Confirm Button */}
                {step === STEPS.CONFIRM_DETAILS && (
                  <button
                    onClick={() => moveTo(STEPS.SAVE_BOOKING)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold shadow-lg text-lg"
                  >
                    <FaCheck /> Confirm & Save Booking
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
