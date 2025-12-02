import express from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  deleteBooking,
} from "../controllers/bookingsController.js";

const router = express.Router();

router.post("/", createBooking);
router.get("/", listBookings);
router.get("/:id", getBooking);
router.delete("/:id", deleteBooking);

export default router;
