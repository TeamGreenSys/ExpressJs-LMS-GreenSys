const Modul = require("../models/ModulModel.js");
const Users = require("../models/UserModel.js");

const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getModul = async (req, res) => {
  try {
    if (req.role === "admin" || req.role === "guru" || req.role === "siswa") {
      const response = await Modul.findAll({
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
      res.status(200).json(response);
    } else {
      const response = await Modul.findAll({
        where: {
          userId: req.userId,
        },
        include: [
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

const getModulById = async (req, res) => {
  try {
    let response;
    if (req.role === "admin" || req.role === "guru" || req.role === "siswa") {
      response = await Modul.findOne({
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
    } else {
      response = await Modul.findOne({
        where: {
          [Op.and]: [{ id: req.params.id }, { userId: req.userId }],
        },
        include: [
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

const createModul = async (req, res) => {
  if (req.files === null)
    return res.status(400).json({ msg: "No File Uploaded" });
  const { judul, deskripsi } = req.body;

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

      await Modul.create({
        judul: judul,
        deskripsi: deskripsi,
        image: fileName,
        url: url,
        userId: req.userId,
      });

      res.json({ msg: "Modul Created" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

const updateModul = async (req, res) => {
  const modul = await Modul.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!modul) return res.status(404).json({ msg: "No Data Found" });

  let fileName = modul.image;
  let url = modul.url;

  // Check if user wants to remove image completely
  if (req.body.removeImage === 'true') {
    // Delete existing image file
    if (modul.image) {
      const filepath = `./public/images/${modul.image}`;
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
    if (modul.image) {
      const filepath = `./public/images/${modul.image}`;
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

  const judul = req.body.judul;
  const deskripsi = req.body.deskripsi;

  try {
    await Modul.update(
      {
        judul: judul,
        deskripsi: deskripsi,
        image: fileName,
        url: url,
        userId: req.userId,
      },
      {
        where: {
          id: req.params.id,
        },
      }
    );
    res.status(200).json({ msg: "Modul Updated Successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

const deleteModul = async (req, res) => {
  const modul = await Modul.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!modul) return res.status(404).json({ msg: "No Data Found" });

  try {
    const filepath = `./public/images/${modul.image}`;
    fs.unlinkSync(filepath);
    await Modul.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Modul Deleted Successfuly" });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getModul,
  getModulById,
  createModul,
  updateModul,
  deleteModul,
};