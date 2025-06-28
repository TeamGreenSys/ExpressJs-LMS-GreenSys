const Soal = require("../models/SoalModel.js");
const GroupSoal = require("../models/GroupSoalModel.js");
const Kelas = require("../models/KelasModel.js");
const Users = require("../models/UserModel.js");
const { Op } = require("sequelize");

const getSoalByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists
    const groupSoal = await GroupSoal.findByPk(groupId);
    if (!groupSoal) {
      return res.status(404).json({ message: "Grup soal tidak ditemukan" });
    }

    const soal = await Soal.findAll({
      where: { groupSoalId: groupId },
      include: [
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["id", "judul", "durasi"],
          include: [
            {
              model: Kelas,
              as: "kelas",
              attributes: ["id", "kelas", "namaKelas"]
            }
          ]
        },
        {
          model: Users,
          attributes: ["username", "email", "role"],
        }
      ],
      order: [["createdAt", "ASC"]]
    });

    res.status(200).json(soal);
  } catch (error) {
    console.error("Error fetching soal by group:", error);
    res.status(500).json({ 
      message: "Gagal mengambil data soal",
      error: error.message 
    });
  }
};

const getSoalById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const soal = await Soal.findByPk(id, {
      include: [
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["id", "judul", "durasi"],
          include: [
            {
              model: Kelas,
              as: "kelas",
              attributes: ["id", "kelas", "namaKelas"]
            }
          ]
        },
        {
          model: Users,
          attributes: ["username", "email", "role"],
        }
      ]
    });

    if (!soal) {
      return res.status(404).json({ message: "Soal tidak ditemukan" });
    }

    res.status(200).json(soal);
  } catch (error) {
    console.error("Error fetching soal by ID:", error);
    res.status(500).json({ 
      message: "Gagal mengambil data soal",
      error: error.message 
    });
  }
};

const createSoal = async (req, res) => {
  try {
    const {
      soal,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctAnswer,
      groupSoalId
    } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!soal || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !groupSoalId) {
      return res.status(400).json({ 
        message: "Soal, opsi A-D, jawaban benar, dan grup soal harus diisi" 
      });
    }

    // Validate correct answer
    const validAnswers = ['A', 'B', 'C', 'D', 'E'];
    if (!validAnswers.includes(correctAnswer.toUpperCase())) {
      return res.status(400).json({ 
        message: "Jawaban benar harus salah satu dari: A, B, C, D, E" 
      });
    }

    // Check if group exists
    const groupSoal = await GroupSoal.findByPk(groupSoalId);
    if (!groupSoal) {
      return res.status(404).json({ message: "Grup soal tidak ditemukan" });
    }

    // Create soal
    const newSoal = await Soal.create({
      soal,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE: optionE || null,
      correctAnswer: correctAnswer.toUpperCase(),
      groupSoalId: parseInt(groupSoalId),
      userId
    });

    // Fetch created soal with relations
    const createdSoal = await Soal.findByPk(newSoal.id, {
      include: [
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["id", "judul", "durasi"]
        }
      ]
    });

    res.status(201).json({
      message: "Soal berhasil dibuat",
      data: createdSoal
    });
  } catch (error) {
    console.error("Error creating soal:", error);
    res.status(500).json({ 
      message: "Gagal membuat soal",
      error: error.message 
    });
  }
};

const updateSoal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      soal,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctAnswer,
      groupSoalId
    } = req.body;
    const userId = req.userId;

    // Check if soal exists and belongs to user
    const existingSoal = await Soal.findOne({
      where: { id, userId }
    });

    if (!existingSoal) {
      return res.status(404).json({ 
        message: "Soal tidak ditemukan atau Anda tidak memiliki akses" 
      });
    }

    // Validate required fields
    if (!soal || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return res.status(400).json({ 
        message: "Soal, opsi A-D, dan jawaban benar harus diisi" 
      });
    }

    // Validate correct answer
    const validAnswers = ['A', 'B', 'C', 'D', 'E'];
    if (!validAnswers.includes(correctAnswer.toUpperCase())) {
      return res.status(400).json({ 
        message: "Jawaban benar harus salah satu dari: A, B, C, D, E" 
      });
    }

    // If groupSoalId is provided, check if it exists
    if (groupSoalId) {
      const groupSoal = await GroupSoal.findByPk(groupSoalId);
      if (!groupSoal) {
        return res.status(404).json({ message: "Grup soal tidak ditemukan" });
      }
    }

    // Update soal
    await existingSoal.update({
      soal,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE: optionE || null,
      correctAnswer: correctAnswer.toUpperCase(),
      ...(groupSoalId && { groupSoalId: parseInt(groupSoalId) })
    });

    // Fetch updated soal with relations
    const updatedSoal = await Soal.findByPk(id, {
      include: [
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["id", "judul", "durasi"]
        }
      ]
    });

    res.status(200).json({
      message: "Soal berhasil diperbarui",
      data: updatedSoal
    });
  } catch (error) {
    console.error("Error updating soal:", error);
    res.status(500).json({ 
      message: "Gagal memperbarui soal",
      error: error.message 
    });
  }
};

const deleteSoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if soal exists and belongs to user
    const soal = await Soal.findOne({
      where: { id, userId }
    });

    if (!soal) {
      return res.status(404).json({ 
        message: "Soal tidak ditemukan atau Anda tidak memiliki akses" 
      });
    }

    // Delete soal - PERBAIKAN: gunakan destroy dengan where
    await Soal.destroy({
      where: { id, userId }
    });

    res.status(200).json({
      message: "Soal berhasil dihapus"
    });
  } catch (error) {
    console.error("Error deleting soal:", error);
    res.status(500).json({ 
      message: "Gagal menghapus soal",
      error: error.message 
    });
  }
};

const getSoalStatistics = async (req, res) => {
  try {
    const userId = req.userId;

    // Total group soal by user
    const totalGroupSoal = await GroupSoal.count({
      where: { userId }
    });

    // Total soal by user
    const totalSoal = await Soal.count({
      where: { userId }
    });

    // Group soal with most soal
    const groupSoalWithSoalCount = await GroupSoal.findAll({
      where: { userId },
      include: [
        {
          model: Kelas,
          as: "kelas",
          attributes: ["namaKelas"]
        }
      ],
      attributes: ["id", "judul"]
    });

    const groupsWithCount = await Promise.all(
      groupSoalWithSoalCount.map(async (group) => {
        const soalCount = await Soal.count({
          where: { groupSoalId: group.id }
        });
        
        return {
          ...group.toJSON(),
          soalCount
        };
      })
    );

    // Sort by soal count
    groupsWithCount.sort((a, b) => b.soalCount - a.soalCount);

    res.status(200).json({
      totalGroupSoal,
      totalSoal,
      averageSoalPerGroup: totalGroupSoal > 0 ? Math.round(totalSoal / totalGroupSoal) : 0,
      topGroups: groupsWithCount.slice(0, 5)
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ 
      message: "Gagal mengambil statistik",
      error: error.message 
    });
  }
};

module.exports = {
  // Soal
  getSoalByGroupId,
  getSoalById,
  createSoal,
  updateSoal,
  deleteSoal,
  
  // Statistics
  getSoalStatistics
};