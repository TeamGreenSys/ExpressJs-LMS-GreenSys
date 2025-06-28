const express = require("express");
const router = express.Router();
const {
  // Soal
  getSoalByGroupId,
  getSoalById,
  createSoal,
  updateSoal,
  deleteSoal,
  
  // Statistics
  getSoalStatistics
} = require("../controllers/SoalController.js");
const { verifyUser } = require("../middleware/AuthUser.js");

// Soal Routes
router.get("/soal-by-group/:groupId", getSoalByGroupId);
router.get("/soal/:id", verifyUser, getSoalById);
router.post("/soal", verifyUser, createSoal);
router.patch("/soal/:id", verifyUser, updateSoal);
router.delete("/soal/:id", verifyUser, deleteSoal);

// Statistics
router.get("/soal-statistics", verifyUser, getSoalStatistics);

module.exports = router;