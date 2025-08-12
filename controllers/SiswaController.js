const Siswa = require("../models/SiswaModel.js");
const Users = require("../models/UserModel.js");
const Kelas = require("../models/KelasModel.js");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getRes = async (req, res) => {
  try {
    res.json("berhasil");
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ msg: "Internal Server Error", error: error.message });
  }
};

const getSiswa = async (req, res) => {
  try {
    const siswa = await Siswa.findAll({
      attributes: { exclude: ["kelaId"] },
      include: [
        {
          model: Users,
          attributes: ["username", "email", "role"],
        },
        {
          model: Kelas,
          attributes: ["id", "kelas"],
          as: "kelas",
        },
      ],
    });
    res.json(siswa);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ msg: "Internal Server Error", error: error.message });
  }
};

const getSiswaById = async (req, res) => {
  try {
    let response;
    if (req.role === "admin" || req.role === "guru") {
      response = await Siswa.findOne({
        attributes: { exclude: ["kelaId"] },
        where: {
          id: req.params.id,
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Kelas,
            attributes: ["id", "kelas"],
            as: "kelas",
          },
        ],
      });
    } else {
      response = await Siswa.findOne({
        attributes: { exclude: ["kelaId"] },
        where: {
          [Op.and]: [{ id: req.params.id }, { userId: req.userId }],
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Kelas,
            attributes: ["id", "kelas"],
            as: "kelas",
          },
        ],
      });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error.message);
  }
};

const getProfileSiswa = async (req, res) => {
  const userId = req.userId; // Get userId from the middleware

  try {
    // Find student with matching userId
    const siswa = await Siswa.findOne({
      where: { userId: userId },
      include: [
        {
          model: Users,
          attributes: ["username", "email", "role"],
        },
        {
          model: Kelas,
          as: "kelas",
        },
      ],
      attributes: {
        exclude: ["kelaId"], // Exclude the kelaId field from results
      },
    });

    if (!siswa) {
      return res.status(404).json({
        status: false,
        message: "Data siswa tidak ditemukan",
        data: null,
      });
    }

    res.status(200).json({
      status: true,
      message: "Berhasil mengambil profil siswa",
      data: siswa,
    });
  } catch (err) {
    console.log("Error fetching profile:", err);
    res.status(500).json({
      status: false,
      message: "Terjadi kesalahan, silahkan coba lagi",
      data: null,
    });
  }
};

const createSiswa = async (req, res) => {
  try {
    const nis = req.body.nis;
    const nama = req.body.nama;
    const email = req.body.email;
    const noHp = req.body.noHp;
    const kelasId = req.body.kelasId;
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
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      url = `${baseUrl}/images/${fileName}`;
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

    // Create the student record
    const siswa = await Siswa.create({
      nis: nis,
      nama: nama,
      email: email,
      noHp: noHp,
      kelasId: kelasId,
      gender: gender,
      tanggalLahir: tanggalLahir,
      alamat: alamat,
      gayaBelajar: null,
      persentaseVisual: null,
      persentaseAuditori: null,
      persentaseKinestetik: null,
      image: fileName,
      url: url,
      userId: req.userId,
    });

    res.status(201).json({
      status: true,
      message: "Siswa berhasil ditambahkan",
      data: {
        id: siswa.id,
      },
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      status: false,
      message: "Gagal menambahkan siswa",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  const siswa = await Siswa.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!siswa) return res.status(404).json({ msg: "No Data Found" });

  let fileName = siswa.image;

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
    const filepath = `./public/images/${siswa.image}`;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath); // Delete the old image
    }

    // Move the new file
    file.mv(`./public/images/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message });
    });
  }
  const nis = req.body.nis;
  const nama = req.body.nama;
  const email = req.body.email;
  const noHp = req.body.noHp;
  const kelasId = req.body.kelasId;
  const gender = req.body.gender;
  const tanggalLahir = req.body.tanggalLahir;
  const alamat = req.body.alamat;
  const gayaBelajar = req.body.gayaBelajar;
  const persentaseVisual = req.body.persentaseVisual;
  const persentaseAuditori = req.body.persentaseAuditori;
  const persentaseKinestetik = req.body.persentaseKinestetik;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${baseUrl}/images/${fileName}`;

  try {
    await Siswa.update(
      {
        nis: nis,
        nama: nama,
        email: email,
        noHp: noHp,
        kelasId: kelasId,
        gender: gender,
        tanggalLahir: tanggalLahir,
        alamat: alamat,
        gayaBelajar: gayaBelajar,
        persentaseVisual: persentaseVisual,
        persentaseAuditori: persentaseAuditori,
        persentaseKinestetik: persentaseKinestetik,
        image: fileName,
        url: url,
      },
      {
        where: {
          id: req.params.id,
        },
      }
    );
    res.status(200).json({ msg: "Siswa Updated Successfuly", imagePath: url, });
  } catch (error) {
    console.log(error.message);
  }
};

const deleteSiswa = async (req, res) => {
  const siswa = await Siswa.findOne({
    where: {
      id: req.params.id,
    },
  });
  if (!siswa) return res.status(404).json({ msg: "No Data Found" });

  try {
    const filepath = `./public/images/${siswa.image}`;
    fs.unlinkSync(filepath);
    await Siswa.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Siswa Deleted Successfuly" });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getRes,
  getSiswa,
  getSiswaById,
  getProfileSiswa,
  createSiswa,
  updateProfile,
  deleteSiswa,
};
