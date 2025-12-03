// STT hook using Web Speech API
import { useState, useRef, useCallback, useEffect } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Speech-to-Text hook using the Web Speech API.
 * @param {{onResult:(text:string)=>void,onError:(err:any)=>void}} params
 * @returns {{startListening:Function, stopListening:Function, isListening:boolean}}
 */
export function useSpeechRecognition({ onResult, onError }) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      if (onErrorRef.current)
        onErrorRef.current(new Error("Speech Recognition not supported"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy

    // Track if a result was received during this recognition session
    let hasResult = false;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      hasResult = false;
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log("Recognized:", transcript);
      hasResult = true;
      setIsListening(false);
      isListeningRef.current = false;
      if (onResultRef.current) onResultRef.current(transcript);
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition info:", event.error);
      setIsListening(false);
      isListeningRef.current = false;

      // Only report critical errors (not no-speech, aborted, etc.)
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        if (onErrorRef.current) {
          onErrorRef.current({
            type: event.error,
            message: "Microphone access denied",
          });
        }
      }
      // Ignore no-speech, aborted, and network errors
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      isListeningRef.current = false;

      // Don't trigger error on no-speech - user can manually retry
      if (!hasResult) {
        console.log("No speech detected - user can click Speak to try again");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error("Recognition not initialized");
      return;
    }

    if (isListeningRef.current) {
      console.warn("Already listening");
      return;
    }

    try {
      // Add a small delay to ensure previous instance is fully stopped
      setTimeout(() => {
        if (!isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log("Starting speech recognition...");
          } catch (err) {
            console.error("Error starting recognition:", err);
            // If already started, ignore the error
            if (err.message && err.message.includes("already started")) {
              console.log("Recognition already started, continuing...");
            } else if (onErrorRef.current) {
              onErrorRef.current(err);
            }
          }
        }
      }, 300);
    } catch (error) {
      console.error("Failed to start recognition:", error);
      if (onErrorRef.current) onErrorRef.current(error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log("Stopping speech recognition...");
      } catch (error) {
        console.error("Failed to stop recognition:", error);
      }
    }
  }, [isListening]);

  return { startListening, stopListening, isListening };
}
