import {
  FaEdit,
  FaUsers,
  FaCalendar,
  FaClock,
  FaUtensils,
  FaSun,
  FaMoon,
  FaCheck,
} from "react-icons/fa";
import { STEPS } from "../utils/steps";

export default function BookingForm({
  isActive,
  booking,
  onFieldChange,
  step,
  onConfirm,
}) {
  return (
    <div className="bg-white rounded-3xl p-8">
      <div className="flex items-center justify-between p-2 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Booking Details</h2>
        {isActive && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Active
          </span>
        )}
      </div>

      {!isActive ? (
        <div className="flex flex-col items-center justify-center h-[28rem] text-gray-400">
          <FaEdit className="text-6xl mb-4" />
          <p className="text-center">Start a booking to fill in details</p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[32rem] overflow-y-auto pr-2">
          {/* Name */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FaEdit className="text-blue-600" /> Name
            </label>
            <input
              type="text"
              value={booking.customerName}
              onChange={(e) => onFieldChange("customerName", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          {/* Number of Guests */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FaUsers className="text-blue-600" /> Number of Guests
            </label>
            <input
              type="number"
              value={booking.numberOfGuests}
              onChange={(e) => onFieldChange("numberOfGuests", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How many guests?"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FaCalendar className="text-blue-600" /> Date
              </label>
              <input
                type="date"
                value={booking.bookingDate}
                onChange={(e) => onFieldChange("bookingDate", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FaClock className="text-blue-600" /> Time
              </label>
              <input
                type="time"
                value={booking.bookingTime}
                onChange={(e) => onFieldChange("bookingTime", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Cuisine Preference */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FaUtensils className="text-blue-600" /> Cuisine Preference
            </label>
            <input
              type="text"
              value={booking.cuisinePreference}
              onChange={(e) =>
                onFieldChange("cuisinePreference", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Italian, Chinese"
            />
          </div>

          {/* Seating Preference */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
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
                onFieldChange("seatingPreference", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Auto (based on weather)</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>

          {/* Special Requests */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FaEdit className="text-blue-600" /> Special Requests
            </label>
            <textarea
              value={booking.specialRequests}
              onChange={(e) => onFieldChange("specialRequests", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
              placeholder="Birthday, anniversary, dietary restrictions, etc."
            />
          </div>

          {step === STEPS.CONFIRM_DETAILS && (
            <button
              onClick={() => onConfirm(STEPS.SAVE_BOOKING)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold  text-lg"
            >
              <FaCheck /> Confirm & Save Booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}
