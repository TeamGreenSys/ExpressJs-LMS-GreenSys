const express = require("express");
const {
    getAllGuru,
    getGuru,
    getProfileGuru,
    getGuruById,
    createGuru,
    updateProfileGuru,
    deleteGuru,
} = require("../controllers/GuruController.js") 
const { verifyUser, adminOnly, guruOnly } = require("../middleware/AuthUser.js") 

const router = express.Router()

router.get('/all-guru', verifyUser, getAllGuru)
router.get('/guru', verifyUser, getGuru)
router.get("/profile-guru", verifyUser, getProfileGuru);
router.get('/guru/:id', verifyUser, getGuruById)
router.post('/guru', verifyUser, createGuru)
router.patch('/guru/:id', verifyUser, guruOnly, updateProfileGuru)
router.delete('/guru/:id', verifyUser, adminOnly, deleteGuru)

module.exports = router;