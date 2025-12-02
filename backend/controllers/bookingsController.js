import Booking from "../models/Booking.js";
import mongoose from "mongoose";

function resolveQueryById(id) {
  if (!id) return null;
  // If valid ObjectId, match by _id; otherwise, use bookingId
  return mongoose.isValidObjectId(id) ? { _id: id } : { bookingId: id };
}

export async function createBooking(req, res) {
  try {
    const doc = await Booking.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function listBookings(req, res) {
  try {
    const items = await Booking.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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
