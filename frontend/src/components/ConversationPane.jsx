import { FaPlay, FaMicrophone } from "react-icons/fa";

/**
 * Presentational component for the conversation area.
 * Shows user/bot messages and voice status badges.
 * Props: conversation[], isSpeaking, isListening, endRef
 */
export default function ConversationPane({
  conversation = [],
  isSpeaking = false,
  isListening = false,
  endRef,
}) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Voice Assistant</h2>
        <div className="flex gap-2">
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
      </div>

      <div className="bg-gray-50 rounded-2xl p-5 mb-4 h-[28rem] overflow-y-auto border border-gray-200">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FaMicrophone className="text-6xl mb-4" />
            <p className="text-center">Start booking to begin conversation</p>
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
                  className={`max-w-[80%] rounded-xl px-12 py-4 ${
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
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
