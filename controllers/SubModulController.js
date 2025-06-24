const SubModul = require("../models/SubModulModel.js");
const Users = require("../models/UserModel.js");
const Modul = require("../models/ModulModel.js");

const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

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

  file.mv(`./public/images/${fileName}`, async (err) => {
    if (err) return res.status(500).json({ msg: err.message });

    try {
      const userId = req.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "User ID not found in the request" });
      }

      await SubModul.create({
        subJudul: subJudul,
        subDeskripsi: subDeskripsi,
        urlYoutube: urlYoutube,
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

  const { subJudul, subDeskripsi, linkYoutube, modulId } = req.body;

  try {
    await SubModul.update(
      {
        subJudul: subJudul,
        subDeskripsi: subDeskripsi,
        linkYoutube: linkYoutube,
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
    const filepath = `./public/images/${subModul.coverImage}`;
    fs.unlinkSync(filepath);
    await SubModul.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Sub Modul Deleted Successfuly" });
  } catch (error) {
    console.log(error.message);
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
