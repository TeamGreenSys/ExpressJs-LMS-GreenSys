const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const Siswa = require("../models/SiswaModel");
const Modul = require("../models/ModulModel");
const Certificate = require("../models/CertificateModel");
const Nilai = require("../models/NilaiModel"); // ✅ Add Nilai import
const Users = require("../models/UserModel.js");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getCertificate = async (req, res) => {
  try {
    if (req.role === "admin" || req.role === "guru") {
      const response = await Certificate.findAll({
        include: [
          {
            model: Siswa,
            attributes: ["nis", "nama", "email"],
            as: "siswa",
          },
          {
            model: Modul,
            attributes: ["judul", "deskripsi"],
            as: "modul",
          },
          {
            model: Nilai, // ✅ Add Nilai include
            attributes: ["skor", "jumlahJawabanBenar", "jumlahSoal"],
            as: "nilai",
          },
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
      res.status(200).json(response);
    } else {
      const response = await Certificate.findAll({
        where: {
          userId: req.userId,
        },
        include: [
          {
            model: Siswa,
            attributes: ["nis", "nama", "email"],
            as: "siswa",
          },
          {
            model: Modul,
            attributes: ["judul", "deskripsi"],
            as: "modul",
          },
          {
            model: Nilai, // ✅ Add Nilai include
            attributes: ["skor", "jumlahJawabanBenar", "jumlahSoal"],
            as: "nilai",
          },
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const getCertificateById = async (req, res) => {
  try {
    let response;
    if (req.role === "admin" || req.role === "guru") {
      response = await Certificate.findOne({
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: Siswa,
            attributes: ["nis", "nama", "email"],
            as: "siswa",
          },
          {
            model: Modul,
            attributes: ["judul", "deskripsi"],
            as: "modul",
          },
          {
            model: Nilai, // ✅ Add Nilai include
            attributes: ["skor", "jumlahJawabanBenar", "jumlahSoal"],
            as: "nilai",
          },
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
    } else {
      response = await Certificate.findOne({
        where: {
          [Op.and]: [{ id: req.params.id }, { userId: req.userId }],
        },
        include: [
          {
            model: Siswa,
            attributes: ["nis", "nama", "email"],
            as: "siswa",
          },
          {
            model: Modul,
            attributes: ["judul", "deskripsi"],
            as: "modul",
          },
          {
            model: Nilai, // ✅ Add Nilai include
            attributes: ["skor", "jumlahJawabanBenar", "jumlahSoal"],
            as: "nilai",
          },
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error.message);
  }
};

// ✅ NEW: Function untuk serve PDF files dengan authentication dan CORS
const serveCertificateFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ msg: 'Invalid filename' });
    }

    // Validate file extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ msg: 'Only PDF files are allowed' });
    }

    // Construct file path
    const filePath = path.join(__dirname, '../public/certificates', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: 'Certificate file not found' });
    }

    // Optional: Check if user has permission to access this certificate
    // Uncomment below if you want to restrict access based on user role or ownership
    /*
    if (req.role === "siswa") {
      // For students, check if they own this certificate
      const certificateRecord = await Certificate.findOne({
        where: { 
          certificateFile: filename,
          userId: req.userId 
        }
      });
      
      if (!certificateRecord) {
        return res.status(403).json({ msg: 'Access denied to this certificate' });
      }
    }
    */

    // Get file stats
    const stat = fs.statSync(filePath);
    
    // Set CORS headers
    const allowedOrigins = [
      'http://localhost:3000',
      'http://192.168.100.78:3000',
      'https://visited-tools-efficiency-temperature.trycloudflare.com'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    }
    
    // Set proper headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error streaming PDF file:', error);
      if (!res.headersSent) {
        res.status(500).json({ msg: 'Error serving PDF file' });
      }
    });

    // Pipe the file to response
    fileStream.pipe(res);

    // Log access for audit purposes
    console.log(`PDF accessed: ${filename} by user ${req.userId} (${req.role})`);

  } catch (error) {
    console.error('Error in serveCertificateFile:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        msg: 'Internal server error', 
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
    }
  }
};

const createCertificate = async (req, res) => {
  try {
    const { siswaId, modulId, nilaiId } = req.body; // ✅ Add nilaiId to destructuring

    // ✅ Enhanced validation
    if (!siswaId || !modulId || !nilaiId) {
      return res.status(400).json({ 
        msg: "Siswa ID, Modul ID, dan Nilai ID wajib diisi" 
      });
    }

    // ✅ Validate that nilaiId exists and belongs to the siswa
    const nilai = await Nilai.findOne({
      where: { 
        id: nilaiId,
        siswaId: siswaId
      },
      include: [{
        model: require("../models/GroupSoalModel.js"),
        as: "groupSoal",
        where: {
          modulId: modulId // Ensure the nilai is for the correct module
        }
      }]
    });

    if (!nilai) {
      return res.status(404).json({ 
        msg: "Nilai tidak ditemukan atau tidak sesuai dengan siswa dan modul yang dipilih" 
      });
    }

    // Cek apakah certificate sudah ada
    const existingCertificate = await Certificate.findOne({
      where: { siswaId, modulId, nilaiId }
    });

    if (existingCertificate) {
      return res.status(400).json({ 
        msg: "Certificate untuk siswa, modul, dan nilai ini sudah ada" 
      });
    }

    // Get data siswa dengan include kelas
    const siswa = await Siswa.findByPk(siswaId, {
      include: [{
        model: require("../models/KelasModel.js"),
        as: "kelas"
      }]
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Siswa tidak ditemukan" });
    }

    // Get data modul
    const modul = await Modul.findByPk(modulId);
    if (!modul) {
      return res.status(404).json({ msg: "Modul tidak ditemukan" });
    }

    // Path ke template PDF
    const templatePath = path.join(__dirname, '../public/templates/certificate-template.pdf');
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ 
        msg: "Template certificate tidak ditemukan. Pastikan file certificate-template.pdf ada di folder public/templates/" 
      });
    }

    // Read template PDF
    const existingPdfBytes = fs.readFileSync(templatePath);

    // Load PDF template
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Register fontkit untuk custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Get first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Load fonts
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Get current date
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ✅ Enhanced text positioning and formatting
    
// Nama siswa - center, larger font (matching frontend: 84px bold Times)
const studentNameText = siswa.nama;
const studentNameFontSize = 42; // PDF font size roughly half of canvas font size
firstPage.drawText(studentNameText, {
  x: width / 2 - (studentNameText.length * (studentNameFontSize * 0.3)), // Better centering calculation
  y: height * 0.55, // Frontend: 45% from top, PDF: 55% (inverted coordinate system)
  size: studentNameFontSize,
  font: timesRomanBoldFont,
  color: rgb(0.12, 0.23, 0.54), // #1e3a8a (blue-900) converted to RGB
});

// Judul modul - below nama (matching frontend: 54px italic Times)
const moduleText = `"telah menyelesaikan modul ${modul.judul}"`;
const moduleFontSize = 27; // Roughly half of 54px
firstPage.drawText(moduleText, {
  x: width / 2 - (moduleText.length * (moduleFontSize * 0.25)), // Better centering for italic text
  y: height * 0.49, // Frontend: 51% from top, PDF: 49% (adjusted for PDF coordinates)
  size: moduleFontSize,
  font: timesRomanFont, // Using regular font as PDF-lib doesn't have built-in italic
  color: rgb(0.22, 0.25, 0.32), // #374151 (gray-700) converted to RGB
});

// ✅ NILAI SKOR - matching frontend positioning and styling
const scoreText = `dengan nilai: ${parseFloat(nilai.skor).toFixed(0)}`;
const scoreFontSize = 24; // Half of 48px from frontend

// Main score (matching frontend: bold 48px Arial, green-600)
firstPage.drawText(scoreText, {
  x: width / 2 - (scoreText.length * (scoreFontSize * 0.3)), // Center horizontally
  y: height * 0.44, // Frontend: 56% from top, PDF: 44% (adjusted)
  size: scoreFontSize,
  font: helveticaBoldFont, // Arial equivalent
  color: rgb(0.02, 0.59, 0.41), // #059669 (green-600) converted to RGB
});

// ✅ Enhanced bottom section - matching frontend exactly
const infoStartX = width * 0.65; // Same as frontend
const infoStartY = height * 0.18; // Frontend: 82% from top, PDF: 18% from bottom
const lineHeight = height * 0.03; // Same as frontend

// currentDate already declared above, no need to redeclare

// Tanggal (matching frontend: 24px Arial, gray-600)
firstPage.drawText(`Tanggal: ${currentDate}`, {
  x: infoStartX,
  y: infoStartY,
  size: 12, // Half of 24px
  font: helveticaFont, // Arial equivalent
  color: rgb(0.29, 0.34, 0.39), // #4b5563 (gray-600) converted to RGB
});

// NIS siswa (matching frontend: 20px Arial, gray-500)
firstPage.drawText(`NIS: ${siswa.nis}`, {
  x: infoStartX,
  y: infoStartY - lineHeight,
  size: 10, // Half of 20px
  font: helveticaFont,
  color: rgb(0.42, 0.45, 0.50), // #6b7280 (gray-500) converted to RGB
});

// Kelas siswa (matching frontend: 20px Arial, gray-500)
if (siswa.kelas) {
  firstPage.drawText(`Kelas: ${siswa.kelas.namaKelas}`, {
    x: infoStartX,
    y: infoStartY - (lineHeight * 2),
    size: 10, // Half of 20px
    font: helveticaFont,
    color: rgb(0.42, 0.45, 0.50), // #6b7280 (gray-500) converted to RGB
  });
}

// Certificate ID untuk tracking (matching frontend: 16px Arial, gray-400)
const certificateId = `CERT-${siswa.nis}-${modul.id}-${nilai.id}`; // Using nilai.id like frontend
firstPage.drawText(`ID: ${certificateId}`, {
  x: infoStartX,
  y: infoStartY - (lineHeight * 3),
  size: 8, // Half of 16px
  font: helveticaFont,
  color: rgb(0.61, 0.64, 0.69), // #9ca3af (gray-400) converted to RGB
});

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `certificate_${siswa.nis}_${modul.id}_${nilaiId}_${timestamp}.pdf`;
    const certificatePath = path.join(__dirname, '../public/certificates', filename);

    // Ensure certificates directory exists
    const certificatesDir = path.join(__dirname, '../public/certificates');
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(certificatePath, pdfBytes);

    // Generate URL - use the certificates static route
    const certificateUrl = `${req.protocol}://${req.get("host")}/certificates/${filename}`;

    // ✅ Save to database with nilaiId
    const newCertificate = await Certificate.create({
      siswaId: siswaId,
      modulId: modulId,
      nilaiId: nilaiId, // ✅ Add nilaiId
      certificateFile: filename,
      certificateUrl: certificateUrl,
      tanggalDiterbitkan: new Date(),
      userId: req.userId
    });

    // ✅ Response dengan data lengkap including nilai
    const certificateWithDetails = await Certificate.findByPk(newCertificate.id, {
      include: [
        {
          model: Siswa,
          as: "siswa",
          include: [{
            model: require("../models/KelasModel.js"),
            as: "kelas"
          }]
        },
        {
          model: Modul,
          as: "modul"
        },
        {
          model: Nilai, // ✅ Include nilai details
          as: "nilai"
        }
      ]
    });

    res.status(201).json({
      msg: "Certificate berhasil digenerate",
      certificate: certificateWithDetails,
      additionalInfo: {
        grade: grade,
        certificateId: certificateId,
        scoreDetails: {
          finalScore: parseFloat(nilai.skor).toFixed(1),
          correctAnswers: nilai.jumlahJawabanBenar,
          totalQuestions: nilai.jumlahSoal,
          percentage: ((nilai.jumlahJawabanBenar / nilai.jumlahSoal) * 100).toFixed(1)
        }
      }
    });

  } catch (error) {
    console.error("Error generating certificate:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

const deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);

    if (!certificate) {
      return res.status(404).json({ msg: "Certificate tidak ditemukan" });
    }

    // Permission check
    if (req.role !== "admin" && req.role !== "guru" && certificate.userId !== req.userId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Delete file
    const filePath = path.join(__dirname, '../public/certificates', certificate.certificateFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Certificate file deleted: ${certificate.certificateFile}`);
    }

    // Delete from database
    await Certificate.destroy({
      where: { id: req.params.id }
    });

    res.status(200).json({ msg: "Certificate berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

module.exports = {
    getCertificate,
    getCertificateById,
    createCertificate,
    deleteCertificate,
    serveCertificateFile
};