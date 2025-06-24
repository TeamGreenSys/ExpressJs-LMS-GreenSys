const express = require("express");
const {
    getUsers,
    getUsersById,
    createUsers,
    updateUsers,
    changePassword,
    deleteUsers,
    sendLinkResetPassword,
    resetPassword
} = require("../controllers/UserController.js") 
const { verifyUser, adminOnly, guruOnly } = require("../middleware/AuthUser.js") 

const router = express.Router()

router.get('/users', verifyUser, getUsers)
router.get('/users/:id', verifyUser, adminOnly, getUsersById)
router.post('/users', createUsers)
router.patch('/users/:id', verifyUser, adminOnly, updateUsers)
router.patch('/change-password', verifyUser, changePassword)
router.delete('/users/:id', verifyUser, adminOnly, deleteUsers)

router.post('/send-link-reset-password', sendLinkResetPassword);
router.post('/reset-password', resetPassword);

module.exports = router;