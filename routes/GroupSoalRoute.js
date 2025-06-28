const express = require("express");
const {
    getAllGroupSoal,
    getGroupSoal,
    getGroupSoalById,
    createGroupSoal,
    updateGroupSoal,
    deleteGroupSoal
} = require("../controllers/GroupSoalController.js") 
const { verifyUser } = require("../middleware/AuthUser.js") 

const router = express.Router()

router.get('/all-group-soal', verifyUser, getAllGroupSoal)
router.get('/group-soal', verifyUser, getGroupSoal)
router.get('/group-soal/:id', verifyUser, getGroupSoalById)
router.post('/group-soal', verifyUser, createGroupSoal)
router.patch('/group-soal/:id', verifyUser, updateGroupSoal)
router.delete('/group-soal/:id', verifyUser, deleteGroupSoal)

module.exports = router;