const express = require("express");
const { getSiswa, getProfileSiswa, createSiswa, updateProfile, deleteSiswa, getSiswaById, getRes } = require("../controllers/SiswaController.js");
const router = express.Router();

const { verifyUser } = require("../middleware/AuthUser.js") 

router.get("/", getRes)
router.get("/profile-siswa", verifyUser, getProfileSiswa);
router.get('/siswa', getSiswa);
router.get('/siswa/:id', verifyUser, getSiswaById);
router.post('/siswa', verifyUser, createSiswa)
router.patch('/siswa/:id', verifyUser, updateProfile)
router.delete('/siswa/:id', verifyUser, deleteSiswa)

module.exports = router;