import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../auth.js";

const router = express.Router();
const studiosCollection = db.collection("studios");

// GET /api/studios - Public catalog with optional category, search, and limit filters
router.get("/", async (req, res) => {
  try {
    const { category, search, limit } = req.query;
    const filter = {};

    // Filter by category if provided and not "all"
    if (category && category.toLowerCase() !== "all") {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    // Case-insensitive search across title, location, and description
    if (search && search.trim() !== "") {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
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

export default router;