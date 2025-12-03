import Booking from "../models/Booking.js";
import mongoose from "mongoose";

/**
 * Resolves a query object by accepting either Mongo _id or nanoid bookingId.
 * @param {string} id
 * @returns {object|null} Mongo query filter
 */
function resolveQueryById(id) {
  if (!id) return null;
  // If valid ObjectId, match by _id; otherwise, use bookingId
  return mongoose.isValidObjectId(id) ? { _id: id } : { bookingId: id };
}

/**
 * POST /api/bookings
 * Creates a new booking document in MongoDB.
 */
export async function createBooking(req, res) {
  try {
    const doc = await Booking.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * GET /api/bookings
 * Lists all bookings ordered by creation time (newest first).
 */
export async function listBookings(req, res) {
  try {
    const items = await Booking.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/bookings/:id
 * Retrieves a booking by Mongo _id or nanoid bookingId.
 */
export async function getBooking(req, res) {
  try {
    const query = resolveQueryById(req.params.id);
    if (!query) return res.status(400).json({ error: "invalid id" });
    const doc = await Booking.findOne(query);
    if (!doc) return res.status(404).json({ error: "not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/bookings/:id
 * Deletes a booking by Mongo _id or nanoid bookingId.
 */
export async function deleteBooking(req, res) {
  try {
    const query = resolveQueryById(req.params.id);
    if (!query) return res.status(400).json({ error: "invalid id" });
    const doc = await Booking.findOneAndDelete(query);
    if (!doc) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
