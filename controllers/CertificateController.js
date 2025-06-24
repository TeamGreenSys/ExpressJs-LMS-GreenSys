const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const Siswa = require("../models/SiswaModel");
const Modul = require("../models/ModulModel");
const Certificate = require("../models/CertificateModel");
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

const createCertificate = async (req, res) => {
    try {
    const { siswaId, modulId } = req.body;

    // Validasi input
    if (!siswaId || !modulId) {
      return res.status(400).json({ 
        msg: "Siswa ID dan Modul ID wajib diisi" 
      });
    }

    // Cek apakah certificate sudah ada
    const existingCertificate = await Certificate.findOne({
      where: { siswaId, modulId }
    });

    if (existingCertificate) {
      return res.status(400).json({ 
        msg: "Certificate untuk siswa dan modul ini sudah ada" 
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

    // Get current date
    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ✅ Koordinat untuk menambahkan text (sesuaikan dengan template Anda)
    // PENTING: Koordinat (0,0) ada di kiri bawah PDF, bukan kiri atas
    
    // Nama siswa - biasanya di tengah certificate
    firstPage.drawText(siswa.nama, {
      x: width / 2 - (siswa.nama.length * 12), // Center horizontally (approximate)
      y: height * 0.5, // 50% dari atas (sesuaikan dengan template)
      size: 28,
      font: timesRomanBoldFont,
      color: rgb(0.1, 0.1, 0.4), // Dark blue
    });

    // Judul modul - di bawah nama
    firstPage.drawText(modul.judul, {
      x: width / 2 - (modul.judul.length * 8), // Center horizontally (approximate)
      y: height * 0.4, // 40% dari atas (sesuaikan dengan template)
      size: 20,
      font: timesRomanFont,
      color: rgb(0.2, 0.2, 0.2), // Dark gray
    });

    // Tanggal - biasanya di kanan bawah
    firstPage.drawText(`Tanggal: ${currentDate}`, {
      x: width * 0.65, // 65% dari kiri
      y: height * 0.15, // 15% dari bawah
      size: 12,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // NIS siswa - tambahan info
    firstPage.drawText(`NIS: ${siswa.nis}`, {
      x: width * 0.65,
      y: height * 0.12,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Kelas siswa
    if (siswa.kelas) {
      firstPage.drawText(`Kelas: ${siswa.kelas.namaKelas}`, {
        x: width * 0.65,
        y: height * 0.09,
        size: 10,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `certificate_${siswa.nis}_${modul.id}_${timestamp}.pdf`;
    const certificatePath = path.join(__dirname, '../public/certificates', filename);

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(certificatePath, pdfBytes);

    // Generate URL
    const certificateUrl = `${req.protocol}://${req.get("host")}/certificates/${filename}`;

    // Save to database
    const newCertificate = await Certificate.create({
      siswaId: siswaId,
      modulId: modulId,
      certificateFile: filename,
      certificateUrl: certificateUrl,
      tanggalDiterbitkan: new Date(),
      userId: req.userId
    });

    // Response dengan data lengkap
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
        }
      ]
    });

    res.status(201).json({
      msg: "Certificate berhasil digenerate",
      certificate: certificateWithDetails
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

    // Delete file
    const filePath = path.join(__dirname, '../public/certificate', certificate.certificateFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
    deleteCertificate
};