import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();
const bookingsCollection = db.collection("bookings");
const studiosCollection = db.collection("studios");

// POST /api/bookings - Protected endpoint for authenticated renters to reserve a studio
router.post("/", requireAuth, async (req, res) => {
  try {
    const { studioId, date, startTime, hours } = req.body;

    if (!studioId || !ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "A valid studio ID is required.",
      });
    }

    if (!date?.trim() || !startTime?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Session date and start time are required.",
      });
    }

    const parsedHours = Number(hours);
    if (Number.isNaN(parsedHours) || parsedHours < 1 || parsedHours > 24) {
      return res.status(400).json({
        success: false,
        message: "Duration must be between 1 and 24 hours.",
      });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    if (studio.hostId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own studio listing.",
      });
    }

    const totalPrice = studio.hourlyRate * parsedHours;

    const newBooking = {
      studioId: studio._id.toString(),
      studioTitle: studio.title,
      studioImage: studio.images?.[0] || "",
      studioLocation: studio.location,
      renterId: req.user.id,
      renterName: req.user.name,
      renterEmail: req.user.email,
      hostId: studio.hostId,
      hostName: studio.hostName,
      date: date.trim(),
      startTime: startTime.trim(),
      hours: parsedHours,
      hourlyRate: studio.hourlyRate,
      totalPrice,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);

    res.status(201).json({
      success: true,
      message: "Booking request submitted successfully!",
      booking: {
        _id: result.insertedId,
        ...newBooking,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit booking request.",
    });
  }
});

// GET /api/bookings/me - Fetch bookings made by the logged-in renter
router.get("/me", requireAuth, async (req, res) => {
  try {
    const bookings = await bookingsCollection
      .find({ renterId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching renter bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your bookings.",
    });
  }
});

// GET /api/bookings/host - Fetch incoming booking requests for the logged-in host's studios
router.get("/host", requireAuth, async (req, res) => {
  try {
    const bookings = await bookingsCollection
      .find({ hostId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching host booking requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incoming booking requests.",
    });
  }
});

// PATCH /api/bookings/:id - Update booking status (host confirms/cancels; renter cancels)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format.",
      });
    }

    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'confirmed' or 'cancelled'.",
      });
    }

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isHost = booking.hostId === req.user.id;
    const isRenter = booking.renterId === req.user.id;

    if (!isHost && !isRenter) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to update this booking.",
      });
    }

    if (isRenter && !isHost && status !== "cancelled") {
      return res.status(403).json({
        success: false,
        message: "Renters can only cancel their own booking requests.",
      });
    }

    await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `Booking marked as ${status}.`,
      booking: {
        ...booking,
        status,
      },
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking status.",
    });
  }
});

// DELETE /api/bookings/:id - Protected endpoint to permanently remove a booking
// (allowed for the renter who created it or the host who owns the studio)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format.",
      });
    }

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isRenter = booking.renterId === req.user.id;
    const isHost = booking.hostId === req.user.id;

    if (!isRenter && !isHost) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to delete this booking.",
      });
    }

    await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete booking.",
    });
  }
});

export default router;