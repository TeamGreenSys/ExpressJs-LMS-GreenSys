const Guru = require("../models/GuruModel.js");
const Users = require("../models/UserModel.js")
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getAllGuru = async (req, res) => {
    try {
      const guru = await Guru.findAll();
      res.json(guru);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ msg: "Internal Server Error", error: error.message });
    }
  };

const getGuru = async (req, res) => {
    try {
        if (req.role === "admin") {
            const guru = await Guru.findAll({
                include: [{
                    model: Users,
                    attributes: ['username', 'email', 'role']
                }],
            });
            res.status(200).json(guru);
        } else {
            const guru = await Guru.findAll({
                where: {
                    userId: req.userId,
                },
                include: [{
                    model: Users,
                    attributes: ['username', 'email', 'role']
                }],
            });
            res.status(200).json(guru);
        }
    } catch (error) {
        res.status(500).json({ msg: error.message })
    }
}

const getProfileGuru = async (req, res) => {
    const userId = req.userId; // Get userId from the middleware
  
    try {
      // Find student with matching userId
      const guru = await Guru.findOne({
        where: { userId: userId },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
        ],
      });
  
      if (!guru) {
        return res.status(404).json({
          status: false,
          message: "Data guru tidak ditemukan",
          data: null
        });
      }
  
      res.status(200).json({
        status: true,
        message: "Berhasil mengambil profil guru",
        data: guru
      });
    } catch (err) {
      console.log("Error fetching profile:", err);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan, silahkan coba lagi",
        data: null
      });
    }
  };

const getGuruById = async (req, res) => {
    try {
        let response;
        if (req.role === "admin") {
            response = await Guru.findOne({
                attributes: ['id', 'nip', 'nama', 'email', 'gender', 'tanggalLahir', 'alamat', 'image', 'url'],
                where: {
                    id: req.params.id
                },
                include: [{
                    model: Users,
                    attributes: ['username', 'email', 'role']
                }]
            })
        } else {
            response = await Guru.findOne({
                attributes: ['id', 'nip', 'nama', 'email', 'gender', 'tanggalLahir', 'alamat', 'image', 'url'],
                where: {
                    [Op.and]: [{ id: req.params.id }, { userId: req.userId }]
                },
                include: [{
                    model: Users,
                    attributes: ['username', 'email', 'role']
                }]
            });
        }
        res.status(200).json(response);
    } catch (error) {
        console.log(error.message);
    }
};

const createGuru = async (req, res) => {
    try {
      const nip = req.body.nip;
      const nama = req.body.nama;
      const email = req.body.email;
      const gender = req.body.gender;
      const tanggalLahir = req.body.tanggalLahir;
      const alamat = req.body.alamat;
      
      // Default values if no image is uploaded
      let fileName = null;
      let url = null;
      
      // Check if a file was uploaded
      if (req.files && req.files.file) {
        const file = req.files.file;
        const fileSize = file.data.length;
        const ext = path.extname(file.name);
        const now = Date.now();
        fileName = now + file.md5 + ext;
        url = `${req.protocol}://${req.get("host")}/images/${fileName}`;
        const allowedType = [".png", ".jpg", ".jpeg"];
        
        // Validate file type
        if (!allowedType.includes(ext.toLowerCase()))
          return res.status(422).json({ msg: "Invalid Image" });
        
        // Validate file size
        if (fileSize > 5000000)
          return res.status(422).json({ msg: "Image must be less than 5 MB" });
        
        // Save the file
        file.mv(`./public/images/${fileName}`, (err) => {
          if (err) return res.status(500).json({ msg: err.message });
        });
      }
      
      // Create the teacher record
      const guru = await Guru.create({
        nip: nip,
        nama: nama,
        email: email,
        gender: gender,
        tanggalLahir: tanggalLahir,
        alamat: alamat,
        image: fileName,
        url: url,
        userId: req.userId,
      });
      
      res.status(201).json({
        status: true,
        message: "Guru berhasil ditambahkan",
        data: {
          id: guru.id
        }
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Gagal menambahkan guru",
        error: error.message
      });
    }
  };

  const updateProfileGuru = async (req, res) => {
    const guru = await Guru.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!guru) return res.status(404).json({ msg: "No Data Found" });
  
    let fileName = guru.image;
  
    if (req.files && req.files.file) {
      const file = req.files.file;
      const fileSize = file.data.length;
      const ext = path.extname(file.name);
      const now = Date.now();
      fileName = now + file.md5 + ext;
      const allowedType = [".png", ".jpg", ".jpeg"];
  
      if (!allowedType.includes(ext.toLowerCase())) {
        return res.status(422).json({ msg: "Invalid Image Format" });
      }
      if (fileSize > 5000000) {
        return res.status(422).json({ msg: "Image must be less than 5 MB" });
      }
  
      // Delete the old image file
      const filepath = `./public/images/${guru.image}`;
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath); // Delete the old image
      }
  
      // Move the new file
      file.mv(`./public/images/${fileName}`, (err) => {
        if (err) return res.status(500).json({ msg: err.message });
      });
    }
    const nip = req.body.nip;
    const nama = req.body.nama;
    const email = req.body.email;
    const gender = req.body.gender;
    const tanggalLahir = req.body.tanggalLahir;
    const alamat = req.body.alamat;
    const url = `${req.protocol}://${req.get("host")}/images/${fileName}`;
  
    try {
      await Guru.update(
        {
          nip: nip,
          nama: nama,
          email: email,
          gender: gender,
          tanggalLahir: tanggalLahir,
          alamat: alamat,
          image: fileName,
          url: url,
        },
        {
          where: {
            id: req.params.id,
          },
        }
      );
      res.status(200).json({ msg: "Guru Updated Successfuly" });
    } catch (error) {
      console.log(error.message);
    }
  };

  const deleteGuru = async (req, res) => {
    const guru = await Guru.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!guru) return res.status(404).json({ msg: "No Data Found" });
  
    try {
      const filepath = `./public/images/${guru.image}`;
      fs.unlinkSync(filepath);
      await Guru.destroy({
        where: {
          id: req.params.id,
        },
      });
      res.status(200).json({ msg: "Guru Deleted Successfuly" });
    } catch (error) {
      console.log(error.message);
    }
  };

module.exports = {
    getAllGuru,
    getGuru,
    getProfileGuru,
    getGuruById,
    createGuru,
    updateProfileGuru,
    deleteGuru
};