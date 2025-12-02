import mongoose from "mongoose";
import { nanoid } from "nanoid";

const WeatherInfoSchema = new mongoose.Schema(
  {
    dateTime: String,
    condition: String,
    temperature: Number,
    description: String,
    rainProbability: Number,
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      default: () => nanoid(6),
      unique: true,
      index: true,
    },

    customerName: { type: String, required: true, trim: true },

    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    bookingDate: String, // "YYYY-MM-DD"
    bookingTime: String, // "HH:MM" 24h

    cuisinePreference: {
      type: String,
      enum: [
        "Italian",
        "Chinese",
        "Indian",
        "Mexican",
        "French",
        "Mediterranean",
        "Thai",
        "Other",
      ],
      trim: true,
    },
    specialRequests: {
      type: String,
      default: "No special requests",
    },

    seatingPreference: {
      type: String,
      enum: ["indoor", "outdoor"],
    },

    // Location for the booking; defaults to Delhi
    location: {
      type: String,
      default: "New Delhi",
      trim: true,
    },

    weatherInfo: WeatherInfoSchema,

    status: {
      type: String,
      default: "confirmed",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
