import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPlay,
  FaRedo,
  FaStop,
} from "react-icons/fa";

export default function VoiceControls({
  showContinuePrompt,
  isActive,
  isListening,
  onContinue,
  onStartNew,
  onStart,
  onToggleListen,
  onCancel,
  onStopSpeaking,
}) {
  return (
    <div className="flex gap-3">
      {showContinuePrompt && !isActive ? (
        <>
          <button
            onClick={onContinue}
            title="Continue Previous"
            aria-label="Continue Previous"
            className="w-14 h-14 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition shadow-lg"
          >
            <FaPlay />
          </button>
          <button
            onClick={onStartNew}
            title="Start New"
            aria-label="Start New"
            className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg"
          >
            <FaRedo />
          </button>
        </>
      ) : !isActive ? (
        <button
          onClick={onStart}
          title="Start Voice Booking"
          aria-label="Start Voice Booking"
          className="w-16 h-16 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg text-xl"
        >
          <FaMicrophone />
        </button>
      ) : (
        <>
          <button
            onClick={() => {
              onStopSpeaking();
              onToggleListen();
            }}
            title={isListening ? "Stop Listening" : "Speak"}
            aria-label={isListening ? "Stop Listening" : "Speak"}
            className={`w-16 h-16 flex items-center justify-center ${
              isListening
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-green-600 hover:bg-green-700"
            } text-white rounded-full transition shadow-lg text-xl`}
          >
            {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>
          <button
            onClick={onCancel}
            title="Cancel"
            aria-label="Cancel"
            className="w-16 h-16 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-lg text-xl"
          >
            <FaStop />
          </button>
        </>
      )}
    </div>
  );
}
