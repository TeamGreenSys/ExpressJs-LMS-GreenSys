const express = require("express");
const {
    getModul,
    getModulById,
    createModul,
    updateModul,
    deleteModul
} = require("../controllers/ModulController.js") 
const { verifyUser } = require("../middleware/AuthUser.js") 

const router = express.Router()

router.get('/modul', verifyUser, getModul)
router.get('/modul/:id', verifyUser, getModulById)
router.post('/modul', verifyUser, createModul)
router.patch('/modul/:id', verifyUser, updateModul)
router.delete('/modul/:id', verifyUser, deleteModul)

module.exports = router;