const express = require("express");
const router = express.Router();
const {
  getQuizByGroupId,
  submitQuiz,
  getQuizResult,
  getStudentQuizResults,
  getAllQuizResults,
  deleteQuizResult,
} = require("../controllers/NilaiController.js");
const { verifyUser } = require("../middleware/AuthUser.js");

// Quiz Routes for Students
router.get("/quiz/:groupId", verifyUser, getQuizByGroupId); // Get quiz questions
router.post("/quiz/submit", verifyUser, submitQuiz); // Submit quiz

// Result Routes
router.get("/quiz-result/:nilaiId", verifyUser, getQuizResult); // Get specific result
router.get("/student-results/:siswaId", verifyUser, getStudentQuizResults); // Get all results for a student
router.get("/all-results", verifyUser, getAllQuizResults); // Get all results (admin/teacher)
router.delete("/quiz-result/:nilaiId", verifyUser, deleteQuizResult); // Delete result

module.exports = router;