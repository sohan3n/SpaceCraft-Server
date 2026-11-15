import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../auth.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();
const studiosCollection = db.collection("studios");

const DEFAULT_STUDIO_IMAGE =
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80";

// Escape user input before it is embedded in a RegExp literal, otherwise
// characters like "(" or "[" in ?category= throw (or match too broadly).
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/studios - Public catalog with optional category, search, and limit filters
router.get("/", async (req, res) => {
  // Never let browsers or Next.js cache filtered results — a cached response
  // is exactly what makes category switches show the previous category's data.
  res.set("Cache-Control", "no-store");

  try {
    const { category, search, limit } = req.query;
    const filter = {};

    if (category && category.toLowerCase() !== "all") {
      // Exact, case-insensitive match on the whole category string.
      filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, "i") };
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { title: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
      ];
    }

    let cursor = studiosCollection.find(filter).sort({ createdAt: -1 });

    if (limit && !Number.isNaN(Number(limit))) {
      cursor = cursor.limit(Number(limit));
    }

    const studios = await cursor.toArray();

    res.status(200).json({
      success: true,
      count: studios.length,
      studios,
    });
  } catch (error) {
    console.error("Error fetching studios:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch studios.",
    });
  }
});

// GET /api/studios/host/me - Protected endpoint to fetch logged-in host's own studios
// Must stay ABOVE /:id so Express does not treat "host" as a studio ID
router.get("/host/me", requireAuth, async (req, res) => {
  try {
    const studios = await studiosCollection
      .find({ hostId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: studios.length,
      studios,
    });
  } catch (error) {
    console.error("Error fetching host studios:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your studio listings.",
    });
  }
});

// POST /api/studios - Protected endpoint for authenticated hosts to list a studio
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      hourlyRate,
      capacity,
      amenities,
      images,
    } = req.body;

    if (!title?.trim() || !description?.trim() || !category?.trim() || !location?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category, and location are required.",
      });
    }

    const parsedRate = Number(hourlyRate);
    const parsedCapacity = Number(capacity);

    if (Number.isNaN(parsedRate) || parsedRate <= 0) {
      return res.status(400).json({
        success: false,
        message: "Hourly rate must be a valid positive number.",
      });
    }

    if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be at least 1 person.",
      });
    }

    const cleanAmenities = Array.isArray(amenities)
      ? amenities.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const cleanImages = Array.isArray(images)
      ? images.map((url) => String(url).trim()).filter(Boolean)
      : [];

    const newStudio = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      location: location.trim(),
      hourlyRate: parsedRate,
      capacity: parsedCapacity,
      amenities: cleanAmenities,
      images: cleanImages.length > 0 ? cleanImages : [DEFAULT_STUDIO_IMAGE],
      hostId: req.user.id,
      hostName: req.user.name,
      createdAt: new Date(),
    };

    const result = await studiosCollection.insertOne(newStudio);

    res.status(201).json({
      success: true,
      message: "Studio listed successfully!",
      studio: {
        _id: result.insertedId,
        ...newStudio,
      },
    });
  } catch (error) {
    console.error("Error creating studio:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create studio listing.",
    });
  }
});

// GET /api/studios/:id - Public single studio details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID format.",
      });
    }

    const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    res.status(200).json({
      success: true,
      studio,
    });
  } catch (error) {
    console.error("Error fetching studio details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch studio details.",
    });
  }
});

// DELETE /api/studios/:id - Protected endpoint for a host to delete their own studio
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID format.",
      });
    }

    const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    if (studio.hostId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only delete your own studio listings.",
      });
    }

    await studiosCollection.deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: "Studio deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting studio:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete studio.",
    });
  }
});

export default router;