const GroupSoal = require("../models/GroupSoalModel.js");
const Modul = require("../models/ModulModel.js");
const Kelas = require("../models/KelasModel.js");
const Soal = require("../models/SoalModel.js");
const Users = require("../models/UserModel.js");

const { Op } = require("sequelize");

const getAllGroupSoal = async (req, res) => {
  try {
    const response = await GroupSoal.findAll({
      include: [
        {
          model: Soal,
          as: "soals",
        },
        {
          model: Kelas,
          as: "kelas",
        },
        {
          model: Modul,
          as: "modul",
          attributes: ["judul", "deskripsi", "url"],
        },
        {
          model: Users,
          attributes: ["username", "email", "role"],
        },
      ],
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const getGroupSoal = async (req, res) => {
  try {
    if (req.role === "admin" || req.role === "guru") {
      const response = await GroupSoal.findAll({
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Modul,
            as: "modul",
            attributes: ["judul", "deskripsi", "url"],
          },
        ],
      });
      res.status(200).json(response);
    } else {
      const response = await GroupSoal.findAll({
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

const getGroupSoalById = async (req, res) => {
  try {
    let response;
    if (req.role === "admin" || req.role === "guru") {
      response = await GroupSoal.findOne({
        attributes: ["id", "judul", "durasi", "kelasId"],
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
            as: "modul",
            attributes: ["judul", "deskripsi", "url"],
          },
        ],
      });
    } else {
      response = await GroupSoal.findOne({
        attributes: ["id", "judul", "durasi", "kelasId"],
        where: {
          [Op.and]: [{ id: req.params.id }, { userId: req.userId }],
        },
        include: [
          {
            model: Users,
            attributes: ["username", "email", "role"],
          },
          {
            model: Modul,
            as: "modul",
            attributes: ["judul", "deskripsi", "url"],
          },
        ],
      });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error.message);
  }
};

const createGroupSoal = async (req, res) => {
  const judul = req.body.judul;
  const durasi = req.body.durasi;
  const kelasId = req.body.kelasId;
  const modulId = req.body.modulId;

  try {
    const userId = req.userId;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "User ID not found in the request" });
    }

    await GroupSoal.create({
      judul: judul,
      durasi: durasi,
      kelasId: kelasId,
      modulId: modulId,
      userId: req.userId,
    });

    res.json({ msg: "Group Soal Created" });
  } catch (error) {
    console.log(error);
  }
};

const updateGroupSoal = async (req, res) => {
  try {
    await GroupSoal.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Group Soal Updated" });
  } catch (error) {
    console.log(error.message);
  }
};

const deleteGroupSoal = async (req, res) => {
  try {
    await GroupSoal.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Group Soal Deleted" });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  getAllGroupSoal,
  getGroupSoal,
  getGroupSoalById,
  createGroupSoal,
  updateGroupSoal,
  deleteGroupSoal,
};
