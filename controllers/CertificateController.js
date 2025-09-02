const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
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
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({ msg: "Invalid filename" });
    }

    // Validate file extension
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ msg: "Only PDF files are allowed" });
    }

    // Construct file path
    const filePath = path.join(__dirname, "../public/certificates", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: "Certificate file not found" });
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
      "http://localhost:3000",
      "http://192.168.100.78:3000",
      "https://visited-tools-efficiency-temperature.trycloudflare.com",
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept"
      );
    }

    // Set proper headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Additional security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Stream the file
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors
    fileStream.on("error", (error) => {
      console.error("Error streaming PDF file:", error);
      if (!res.headersSent) {
        res.status(500).json({ msg: "Error serving PDF file" });
      }
    });

    // Pipe the file to response
    fileStream.pipe(res);

    // Log access for audit purposes
    console.log(
      `PDF accessed: ${filename} by user ${req.userId} (${req.role})`
    );
  } catch (error) {
    console.error("Error in serveCertificateFile:", error);
    if (!res.headersSent) {
      res.status(500).json({
        msg: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Server error",
      });
    }
  }
};

const createCertificate = async (req, res) => {
  try {
    const { siswaId, modulId, nilaiId, imageData } = req.body;

    // ✅ Enhanced validation
    if (!siswaId || !modulId || !nilaiId) {
      return res.status(400).json({
        msg: "Siswa ID, Modul ID, dan Nilai ID wajib diisi",
      });
    }

    // ✅ Validate imageData if provided (base64 image from canvas)
    if (!imageData) {
      return res.status(400).json({
        msg: "Image data dari canvas frontend diperlukan",
      });
    }

    // ✅ Validate that nilaiId exists and belongs to the siswa
    const nilai = await Nilai.findOne({
      where: {
        id: nilaiId,
        siswaId: siswaId,
      },
      include: [
        {
          model: require("../models/GroupSoalModel.js"),
          as: "groupSoal",
          where: {
            modulId: modulId,
          },
        },
      ],
    });

    if (!nilai) {
      return res.status(404).json({
        msg: "Nilai tidak ditemukan atau tidak sesuai dengan siswa dan modul yang dipilih",
      });
    }

    // Cek apakah certificate sudah ada
    const existingCertificate = await Certificate.findOne({
      where: { siswaId, modulId, nilaiId },
    });

    if (existingCertificate) {
      return res.status(400).json({
        msg: "Certificate untuk siswa, modul, dan nilai ini sudah ada",
      });
    }

    // Get data siswa dengan include kelas
    const siswa = await Siswa.findByPk(siswaId, {
      include: [
        {
          model: require("../models/KelasModel.js"),
          as: "kelas",
        },
      ],
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Siswa tidak ditemukan" });
    }

    // Get data modul
    const modul = await Modul.findByPk(modulId);
    if (!modul) {
      return res.status(404).json({ msg: "Modul tidak ditemukan" });
    }

    try {
      // ✅ Process image data from frontend canvas
      // Remove data URL prefix (data:image/png;base64,)
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `certificate_${siswa.nis}_${modul.id}_${nilaiId}_${timestamp}.png`;
      const certificatePath = path.join(__dirname, "../public/certificates", filename);

      // Ensure certificates directory exists
      const certificatesDir = path.join(__dirname, "../public/certificates");
      if (!fs.existsSync(certificatesDir)) {
        fs.mkdirSync(certificatesDir, { recursive: true });
      }

      // ✅ Save the canvas image directly as PNG
      fs.writeFileSync(certificatePath, imageBuffer);

      // Generate URL
      const certificateUrl = `${req.protocol}://${req.get("host")}/certificates/${filename}`;

      // ✅ Save to database
      const newCertificate = await Certificate.create({
        siswaId: siswaId,
        modulId: modulId,
        nilaiId: nilaiId,
        certificateFile: filename,
        certificateUrl: certificateUrl,
        tanggalDiterbitkan: new Date(),
        userId: req.userId,
      });

      // Response dengan data lengkap
      const certificateWithDetails = await Certificate.findByPk(newCertificate.id, {
        include: [
          {
            model: Siswa,
            as: "siswa",
            include: [
              {
                model: require("../models/KelasModel.js"),
                as: "kelas",
              },
            ],
          },
          {
            model: Modul,
            as: "modul",
          },
          {
            model: Nilai,
            as: "nilai",
            include: [
              {
                model: require("../models/GroupSoalModel.js"),
                as: "groupSoal",
              },
            ],
          },
        ],
      });

      // ✅ Calculate grade info for response
      const score = parseFloat(nilai.skor);
      let gradeInfo;
      if (score >= 90) {
        gradeInfo = { grade: "EXCELLENT", color: "#059669", icon: "🏆" };
      } else if (score >= 80) {
        gradeInfo = { grade: "VERY GOOD", color: "#16a34a", icon: "⭐" };
      } else if (score >= 70) {
        gradeInfo = { grade: "GOOD", color: "#ca8a04", icon: "👍" };
      } else if (score >= 60) {
        gradeInfo = { grade: "SATISFACTORY", color: "#ea580c", icon: "👌" };
      } else {
        gradeInfo = { grade: "NEEDS IMPROVEMENT", color: "#dc2626", icon: "📈" };
      }

      res.status(201).json({
        msg: "Certificate berhasil disimpan dari canvas frontend",
        certificate: certificateWithDetails,
        additionalInfo: {
          certificateId: `CERT-${siswa.nis}-${modul.id}-${nilai.id}`,
          scoreDetails: {
            finalScore: parseFloat(nilai.skor).toFixed(1),
            correctAnswers: nilai.jumlahJawabanBenar,
            totalQuestions: nilai.jumlahSoal,
            percentage: ((nilai.jumlahJawabanBenar / nilai.jumlahSoal) * 100).toFixed(1),
          },
          gradeInfo: gradeInfo,
          fileInfo: {
            filename: filename,
            format: "PNG",
            source: "Frontend Canvas"
          }
        },
      });

    } catch (imageError) {
      console.error("Error processing image data:", imageError);
      return res.status(400).json({
        msg: "Error memproses data gambar dari canvas",
        error: imageError.message,
      });
    }

  } catch (error) {
    console.error("Error generating certificate:", error);
    res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
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
    if (
      req.role !== "admin" &&
      req.role !== "guru" &&
      certificate.userId !== req.userId
    ) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Delete file
    const filePath = path.join(
      __dirname,
      "../public/certificates",
      certificate.certificateFile
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Certificate file deleted: ${certificate.certificateFile}`);
    }

    // Delete from database
    await Certificate.destroy({
      where: { id: req.params.id },
    });

    res.status(200).json({ msg: "Certificate berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    res.status(500).json({
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getCertificate,
  getCertificateById,
  createCertificate,
  deleteCertificate,
  serveCertificateFile,
};
