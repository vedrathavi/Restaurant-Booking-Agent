// TTS hook using Web Speech API
import { useState, useCallback, useEffect } from 'react';

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text, onEnd) => {
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Small delay to ensure cancellation completes
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        
        // Select female voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(voice => 
          voice.name.includes('Female') || 
          voice.name.includes('Zira') || 
          voice.name.includes('Google US English Female') ||
          (voice.lang === 'en-US' && voice.name.toLowerCase().includes('female'))
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        utterance.onstart = () => {
          console.log('Speech started:', text.substring(0, 50) + '...');
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          console.log('Speech ended');
          setIsSpeaking(false);
          if (onEnd) onEnd();
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          setIsSpeaking(false);
          // Resolve regardless of error type
          resolve();
        };

        // Check if speech synthesis is available
        if (window.speechSynthesis) {
          window.speechSynthesis.speak(utterance);
        } else {
          console.error('Speech synthesis not available');
          setIsSpeaking(false);
          resolve();
        }
      }, 50);
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
