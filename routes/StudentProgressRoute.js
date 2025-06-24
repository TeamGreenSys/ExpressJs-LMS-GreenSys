const express = require("express");
const {
  startProgress,
  updateProgress,
  markAsCompleted,
  getStudentProgressByModule,
  getStudentProgressBySubModule,
  checkAccess,
  getStudentStatistics
} = require("../controllers/StudentProgressController.js");
const { verifyUser, isSiswa } = require("../middleware/AuthUser.js");

const router = express.Router();

router.post('/student-progress/start', verifyUser, isSiswa, startProgress);
router.patch('/student-progress/update', verifyUser, isSiswa, updateProgress);
router.patch('/student-progress/complete', verifyUser, isSiswa, markAsCompleted);
router.get('/student-progress/module/:modulId', verifyUser, isSiswa, getStudentProgressByModule);
router.get('/student-progress/submodule/:subModulId', verifyUser, isSiswa, getStudentProgressBySubModule);
router.get('/student-progress/check-access/:currentSubModulId', verifyUser, isSiswa, checkAccess);
router.get('/student-progress/statistics', verifyUser, isSiswa, getStudentStatistics);

module.exports = router;