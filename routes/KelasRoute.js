const express = require("express");
const {
    getAllKelas,
    getKelas,
    getKelasById,
    createKelas,
    updateKelas,
    deleteKelas
} = require("../controllers/KelasController.js") 
const { verifyUser } = require("../middleware/AuthUser.js") 

const router = express.Router()

router.get('/all-kelas', verifyUser, getAllKelas)
router.get('/kelas', verifyUser, getKelas)
router.get('/kelas/:id', verifyUser, getKelasById)
router.post('/kelas', verifyUser, createKelas)
router.patch('/kelas/:id', verifyUser, updateKelas)
router.delete('/kelas/:id', verifyUser, deleteKelas)

module.exports = router;