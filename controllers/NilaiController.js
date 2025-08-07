const Nilai = require("../models/NilaiModel.js");
const NilaiSoal = require("../models/NilaiSoalModel.js");
const Siswa = require("../models/SiswaModel.js");
const Modul = require("../models/ModulModel.js");
const GroupSoal = require("../models/GroupSoalModel.js");
const Soal = require("../models/SoalModel.js");
const Kelas = require("../models/KelasModel.js");
const Users = require("../models/UserModel.js");

// Get quiz by GroupSoal ID with questions for student
const getQuizByGroupId = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get group soal with kelas info
    const groupSoal = await GroupSoal.findByPk(groupId, {
      include: [
        {
          model: Kelas,
          as: "kelas",
          attributes: ["id", "kelas", "namaKelas"],
        },
        {
          model: Modul,
          as: "modul",
          attributes: ["judul", "deskripsi", "url"],
        },
      ],
    });

    if (!groupSoal) {
      return res.status(404).json({ message: "Group soal tidak ditemukan" });
    }

    // Get all soal for this group
    const soals = await Soal.findAll({
      where: { groupSoalId: groupId },
      attributes: [
        "id",
        "soal",
        "judul",
        "image",
        "url",
        "cerita",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "optionE",
        "correctAnswer",
      ],
      order: [["id", "ASC"]],
    });

    if (soals.length === 0) {
      return res.status(404).json({ message: "Tidak ada soal dalam grup ini" });
    }

    res.status(200).json({
      success: true,
      data: {
        groupSoal: {
          id: groupSoal.id,
          judul: groupSoal.judul,
          durasi: groupSoal.durasi,
          kelas: groupSoal.kelas,
          modul: groupSoal.modul,
        },
        soals: soals,
        totalSoal: soals.length,
      },
    });
  } catch (error) {
    console.error("Error getting quiz:", error);
    res.status(500).json({ message: error.message });
  }
};

// Submit quiz results - Modified to allow retakes
const submitQuiz = async (req, res) => {
  try {
    console.log("Received quiz submission:", req.body);

    const { skor, jumlahJawabanBenar, siswaId, groupSoalId, detailedAnswers } =
      req.body;
    const userId = req.userId;

    // Validate required fields with more detailed logging
    if (skor === undefined || skor === null) {
      console.log("Missing skor:", skor);
      return res.status(400).json({ message: "Skor diperlukan" });
    }

    if (jumlahJawabanBenar === undefined || jumlahJawabanBenar === null) {
      console.log("Missing jumlahJawabanBenar:", jumlahJawabanBenar);
      return res
        .status(400)
        .json({ message: "Jumlah jawaban benar diperlukan" });
    }

    if (!siswaId) {
      console.log("Missing siswaId:", siswaId);
      return res.status(400).json({ message: "Siswa ID diperlukan" });
    }

    if (!groupSoalId) {
      console.log("Missing groupSoalId:", groupSoalId);
      return res.status(400).json({ message: "Group soal ID diperlukan" });
    }

    if (!detailedAnswers || !Array.isArray(detailedAnswers)) {
      console.log("Missing or invalid detailedAnswers:", detailedAnswers);
      return res.status(400).json({
        message: "Detailed answers diperlukan dan harus berupa array",
      });
    }

    // Check if siswa exists
    const siswa = await Siswa.findByPk(siswaId);
    if (!siswa) {
      console.log("Siswa not found:", siswaId);
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    }

    // Check if group soal exists
    const groupSoal = await GroupSoal.findByPk(groupSoalId);
    if (!groupSoal) {
      console.log("GroupSoal not found:", groupSoalId);
      return res.status(404).json({ message: "Group soal tidak ditemukan" });
    }

    // Check if student already took this quiz
    const existingNilai = await Nilai.findOne({
      where: {
        siswaId: siswaId,
        groupSoalId: groupSoalId,
      },
    });

    // Get total soal count for validation
    const totalSoal = await Soal.count({
      where: { groupSoalId: groupSoalId },
    });

    const skorFloat = parseFloat(skor);
    const jumlahJawabanBenarInt = parseInt(jumlahJawabanBenar);

    let nilai;

    if (existingNilai) {
      // Update existing record (retake quiz)
      console.log("Updating existing quiz result for:", { siswaId, groupSoalId });
      
      await existingNilai.update({
        skor: skorFloat,
        jumlahJawabanBenar: jumlahJawabanBenarInt,
        jumlahSoal: totalSoal,
        userId: userId,
      });

      // Delete old detailed answers
      await NilaiSoal.destroy({
        where: { nilaiId: existingNilai.id },
      });

      nilai = existingNilai;
      console.log("Existing nilai updated successfully:", nilai.id);
    } else {
      // Create new record (first attempt)
      console.log("Creating new nilai record with data:", {
        skor: skorFloat,
        jumlahJawabanBenar: jumlahJawabanBenarInt,
        jumlahSoal: totalSoal,
        siswaId: parseInt(siswaId),
        groupSoalId: parseInt(groupSoalId),
        userId: userId,
      });

      nilai = await Nilai.create({
        skor: skorFloat,
        jumlahJawabanBenar: jumlahJawabanBenarInt,
        jumlahSoal: totalSoal,
        siswaId: parseInt(siswaId),
        groupSoalId: parseInt(groupSoalId),
        userId: userId,
      });

      console.log("New nilai created successfully:", nilai.id);
    }

    // Create new detailed answers records
    if (detailedAnswers && Array.isArray(detailedAnswers)) {
      const nilaiSoalData = detailedAnswers.map((answer) => ({
        nilaiId: nilai.id,
        soalId: answer.soalId,
        jawaban: answer.jawaban,
        benar: answer.benar || false,
      }));

      console.log("Creating NilaiSoal records:", nilaiSoalData.length);
      await NilaiSoal.bulkCreate(nilaiSoalData);
      console.log("NilaiSoal records created successfully");
    }

    const responseMessage = existingNilai 
      ? "Kuis berhasil dikerjakan ulang dan nilai telah diperbarui"
      : "Quiz berhasil diselesaikan";

    res.status(201).json({
      success: true,
      message: responseMessage,
      nilaiId: nilai.id,
      isRetake: !!existingNilai,
      data: {
        id: nilai.id,
        skor: nilai.skor,
        jumlahJawabanBenar: nilai.jumlahJawabanBenar,
        jumlahSoal: nilai.jumlahSoal,
        siswaId: nilai.siswaId,
        groupSoalId: nilai.groupSoalId,
      },
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Terjadi kesalahan server",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get quiz result by ID
const getQuizResult = async (req, res) => {
  try {
    const { nilaiId } = req.params;

    const nilai = await Nilai.findByPk(nilaiId, {
      include: [
        {
          model: Siswa,
          as: "siswa",
          include: [
            {
              model: Users,
              attributes: ["username", "email"],
            },
            {
              model: Kelas,
              as: "kelas",
              attributes: ["kelas", "namaKelas"],
            },
          ],
        },
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["id", "judul", "durasi"],
          include: [
            {
              model: Modul,
              as: "modul",
              attributes: ["id", "judul", "deskripsi", "url"],
            },
          ],
        },
        {
          model: NilaiSoal,
          as: "nilai_soals",
          include: [
            {
              model: Soal,
              as: "soal",
              attributes: [
                "soal",
                "judul",
                "image",
                "url",
                "cerita",
                "optionA",
                "optionB",
                "optionC",
                "optionD",
                "optionE",
                "correctAnswer",
              ],
            },
          ],
        },
      ],
    });

    if (!nilai) {
      return res.status(404).json({ message: "Hasil quiz tidak ditemukan" });
    }

    res.status(200).json({
      success: true,
      data: nilai,
    });
  } catch (error) {
    console.error("Error getting quiz result:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz results for a student
const getStudentQuizResults = async (req, res) => {
  try {
    const { siswaId } = req.params;

    const nilaiList = await Nilai.findAll({
      where: { siswaId: siswaId },
      include: [
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["judul", "durasi"],
          include: [
            {
              model: Modul,
              as: "modul",
              attributes: ["id", "judul"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: nilaiList,
    });
  } catch (error) {
    console.error("Error getting student quiz results:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all quiz results (for admin/teacher)
const getAllQuizResults = async (req, res) => {
  try {
    const nilaiList = await Nilai.findAll({
      include: [
        {
          model: Siswa,
          as: "siswa",
          include: [
            {
              model: Users,
              attributes: ["username", "email"],
            },
            {
              model: Kelas,
              as: "kelas",
              attributes: ["kelas", "namaKelas"],
            },
          ],
        },
        {
          model: GroupSoal,
          as: "groupSoal",
          attributes: ["judul", "durasi"],
          include: [
            {
              model: Modul,
              as: "modul",
              attributes: ["judul"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: nilaiList,
    });
  } catch (error) {
    console.error("Error getting all quiz results:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete quiz result
const deleteQuizResult = async (req, res) => {
  try {
    const { nilaiId } = req.params;

    const nilai = await Nilai.findByPk(nilaiId);
    if (!nilai) {
      return res.status(404).json({ message: "Hasil quiz tidak ditemukan" });
    }

    // Delete related NilaiSoal records first
    await NilaiSoal.destroy({
      where: { nilaiId: nilaiId },
    });

    // Delete the Nilai record
    await nilai.destroy();

    res.status(200).json({
      success: true,
      message: "Hasil quiz berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting quiz result:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQuizByGroupId,
  submitQuiz,
  getQuizResult,
  getStudentQuizResults,
  getAllQuizResults,
  deleteQuizResult,
};
