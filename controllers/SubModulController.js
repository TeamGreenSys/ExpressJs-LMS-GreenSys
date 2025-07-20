const SubModul = require("../models/SubModulModel.js");
const Users = require("../models/UserModel.js");
const Modul = require("../models/ModulModel.js");

const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API || "AIzaSyAqUq6TQjaWUFHbDuUG0259CmJ8gNi3hyo";

// Fungsi untuk mengekstrak video ID dari URL YouTube
const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Fungsi untuk konversi durasi ISO 8601 ke detik
const parseISO8601Duration = (duration) => {
  const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  
  const days = parseInt(matches[1]) || 0;
  const hours = parseInt(matches[2]) || 0;
  const minutes = parseInt(matches[3]) || 0;
  const seconds = parseInt(matches[4]) || 0;
  
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
};

// Fungsi untuk format detik ke format MM:SS atau HH:MM:SS
const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};

// Fungsi untuk mendapatkan durasi video YouTube
const getYouTubeDuration = async (videoUrl) => {
  try {
    if (!YOUTUBE_API_KEY) {
      console.log("YouTube API Key not found");
      return null;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      console.log("Invalid YouTube URL");
      return null;
    }

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        id: videoId,
        part: 'contentDetails',
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const duration = response.data.items[0].contentDetails.duration;
      const totalSeconds = parseISO8601Duration(duration);
      return formatDuration(totalSeconds);
    }

    return null;
  } catch (error) {
    console.error("Error fetching YouTube duration:", error.message);
    return null;
  }
};

const getSubModul = async (req, res) => {
  try {
    if (req.role === "admin" || req.role === "guru" || req.role === "siswa") {
      const response = await SubModul.findAll({
        include: [
          {
            model: Modul,
            attributes: ["id", "judul"],
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
      const response = await SubModul.findAll({
        where: {
          userId: req.userId,
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Modul,
            attributes: ["id", "judul"],
            as: "modul",
          },
        ],
      });
      res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const getSubModulById = async (req, res) => {
  try {
    let response;
    if (req.role === "admin" || req.role === "guru" || req.role === "siswa") {
      response = await SubModul.findOne({
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Modul,
            attributes: ["id", "judul"],
            as: "modul",
          },
        ],
      });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error.message);
  }
};

const getSubModulByModulId = async (req, res) => {
  try {
    const modulId = req.params.modulId;

    if (!modulId) {
      return res.status(400).json({ msg: "ModulId is required" });
    }

    let response;
    if (req.role === "admin" || req.role === "guru" || req.role === "siswa") {
      // Admin and teachers can access all subModuls for a specific modul
      response = await SubModul.findAll({
        where: {
          modulId: modulId,
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Modul,
            attributes: ["id", "judul"],
            as: "modul",
          },
        ],
        order: [["createdAt", "ASC"]], // Order by creation date
      });
    }

    if (response.length === 0) {
      return res
        .status(404)
        .json({ msg: "No sub modules found for this modul" });
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const createSubModul = async (req, res) => {
  if (req.files === null)
    return res.status(400).json({ msg: "No File Uploaded" });

  const { subJudul, subDeskripsi, urlYoutube, modulId } = req.body;

  const file = req.files.file;
  const fileSize = file.data.length;
  const ext = path.extname(file.name);
  const now = Date.now();
  const fileName = now + file.md5 + ext;
  const url = `${req.protocol}://${req.get("host")}/images/${fileName}`;
  const allowedType = [".png", ".jpg", ".jpeg"];

  if (!allowedType.includes(ext.toLowerCase()))
    return res.status(422).json({ msg: "Invalid Image" });

  if (fileSize > 5000000)
    return res.status(422).json({ msg: "Image must be less than 5 MB" });

  // Handle PDF file upload
  let pdfFileName = null;
  let pdfUrl = null;
  
  if (req.files.pdfFile) {
    const pdfFile = req.files.pdfFile;
    const pdfFileSize = pdfFile.data.length;
    const pdfExt = path.extname(pdfFile.name);
    
    if (pdfExt.toLowerCase() !== '.pdf') {
      return res.status(422).json({ msg: "File must be PDF format" });
    }
    
    if (pdfFileSize > 10000000) { // 10MB limit for PDF
      return res.status(422).json({ msg: "PDF file must be less than 10 MB" });
    }
    
    pdfFileName = now + pdfFile.md5 + pdfExt;
    pdfUrl = `${req.protocol}://${req.get("host")}/pdf/${pdfFileName}`;
  }

  file.mv(`./public/images/${fileName}`, async (err) => {
    if (err) return res.status(500).json({ msg: err.message });

    // Upload PDF file if exists
    if (req.files.pdfFile) {
      req.files.pdfFile.mv(`./public/pdf/${pdfFileName}`, (pdfErr) => {
        if (pdfErr) return res.status(500).json({ msg: pdfErr.message });
      });
    }

    try {
      const userId = req.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "User ID not found in the request" });
      }

      let videoDuration = null;
      if (urlYoutube) {
        videoDuration = await getYouTubeDuration(urlYoutube);
        console.log("Video duration:", videoDuration);
      }

      await SubModul.create({
        subJudul: subJudul,
        subDeskripsi: subDeskripsi,
        urlYoutube: urlYoutube,
        time: videoDuration,
        namaPdf: pdfFileName,
        urlPdf: pdfUrl,
        coverImage: fileName,
        url: url,
        modulId: modulId,
        userId: req.userId,
      });

      res.json({ msg: "Sub Modul Created" });
    } catch (error) {
      console.log(error);
    }
  });
};

const updateSubModul = async (req, res) => {
  const subModul = await SubModul.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!subModul) return res.status(404).json({ msg: "No Data Found" });

  let fileName = subModul.coverImage;
  let url = subModul.url;
  let pdfFileName = subModul.namaPdf;
  let pdfUrl = subModul.urlPdf;

  // Check if user wants to remove image completely
  if (req.body.removeImage === 'true') {
    // Delete existing image file
    if (subModul.coverImage) {
      const filepath = `./public/images/${subModul.coverImage}`;
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (err) {
        console.log("Error deleting file:", err);
      }
    }
    fileName = null;
    url = null;
  } 
  // Check if new image is uploaded
  else if (req.files && req.files.file) {
    const file = req.files.file;
    const fileSize = file.data.length;
    const ext = path.extname(file.name);
    const now = Date.now();
    fileName = now + file.md5 + ext;
    const allowedType = [".png", ".jpg", ".jpeg"];

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" });
    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" });

    // Delete old image if exists
    if (subModul.coverImage) {
      const filepath = `./public/images/${subModul.coverImage}`;
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (err) {
        console.log("Error deleting old file:", err);
      }
    }

    // Upload new image
    file.mv(`./public/images/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message });
    });
    
    url = `${req.protocol}://${req.get("host")}/images/${fileName}`;
  }

  // Handle PDF file operations
  if (req.body.removePdf === 'true') {
    // Delete existing PDF file
    if (subModul.namaPdf) {
      const pdfFilepath = `./public/pdf/${subModul.namaPdf}`;
      try {
        if (fs.existsSync(pdfFilepath)) {
          fs.unlinkSync(pdfFilepath);
        }
      } catch (err) {
        console.log("Error deleting PDF file:", err);
      }
    }
    pdfFileName = null;
    pdfUrl = null;
  }
  // Check if new PDF is uploaded
  else if (req.files && req.files.pdfFile) {
    const pdfFile = req.files.pdfFile;
    const pdfFileSize = pdfFile.data.length;
    const pdfExt = path.extname(pdfFile.name);
    const now = Date.now();
    
    if (pdfExt.toLowerCase() !== '.pdf') {
      return res.status(422).json({ msg: "File must be PDF format" });
    }
    
    if (pdfFileSize > 10000000) { // 10MB limit for PDF
      return res.status(422).json({ msg: "PDF file must be less than 10 MB" });
    }

    // Delete old PDF if exists
    if (subModul.namaPdf) {
      const pdfFilepath = `./public/pdf/${subModul.namaPdf}`;
      try {
        if (fs.existsSync(pdfFilepath)) {
          fs.unlinkSync(pdfFilepath);
        }
      } catch (err) {
        console.log("Error deleting old PDF file:", err);
      }
    }

    pdfFileName = now + pdfFile.md5 + pdfExt;
    pdfUrl = `${req.protocol}://${req.get("host")}/pdf/${pdfFileName}`;

    // Upload new PDF file
    pdfFile.mv(`./public/pdf/${pdfFileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message });
    });
  }

  const { subJudul, subDeskripsi, urlYoutube, modulId } = req.body;

  try {
    let videoDuration = subModul.time; // Keep existing duration
    if (urlYoutube && urlYoutube !== subModul.urlYoutube) {
      videoDuration = await getYouTubeDuration(urlYoutube);
      console.log("Updated video duration:", videoDuration);
    }

    await SubModul.update(
      {
        subJudul: subJudul,
        subDeskripsi: subDeskripsi,
        urlYoutube: urlYoutube,
        time: videoDuration,
        namaPdf: pdfFileName,
        urlPdf: pdfUrl,
        coverImage: fileName,
        url: url,
        modulId: modulId,
        userId: req.userId,
      },
      {
        where: {
          id: req.params.id,
        },
      }
    );
    res.status(200).json({ msg: "Sub Modul Updated Successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const deleteSubModul = async (req, res) => {
  const subModul = await SubModul.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!subModul) return res.status(404).json({ msg: "No Data Found" });

  try {
    // Delete image file if exists
    if (subModul.coverImage) {
      const imageFilepath = `./public/images/${subModul.coverImage}`;
      try {
        if (fs.existsSync(imageFilepath)) {
          fs.unlinkSync(imageFilepath);
        }
      } catch (err) {
        console.log("Error deleting image file:", err);
      }
    }

    // Delete PDF file if exists
    if (subModul.namaPdf) {
      const pdfFilepath = `./public/pdf/${subModul.namaPdf}`;
      try {
        if (fs.existsSync(pdfFilepath)) {
          fs.unlinkSync(pdfFilepath);
        }
      } catch (err) {
        console.log("Error deleting PDF file:", err);
      }
    }

    await SubModul.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Sub Modul Deleted Successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

module.exports = {
  getSubModul,
  getSubModulById,
  getSubModulByModulId,
  createSubModul,
  updateSubModul,
  deleteSubModul,
};
