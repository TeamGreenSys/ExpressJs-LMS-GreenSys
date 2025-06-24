const express = require("express");
const {
  getCertificate,
  getCertificateById,
  createCertificate,
  deleteCertificate,
} = require("../controllers/CertificateController.js");
const { verifyUser } = require("../middleware/AuthUser.js");

const router = express.Router();

router.get('/certificate', verifyUser, getCertificate);
router.get('/certificate/:id', verifyUser, getCertificateById);
router.delete('/certificate/:id', verifyUser, deleteCertificate);
router.post('/certificate', verifyUser, createCertificate);

module.exports = router;