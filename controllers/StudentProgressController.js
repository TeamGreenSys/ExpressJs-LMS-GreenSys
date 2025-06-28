const StudentProgress = require("../models/StudentProgressModel.js");
const Siswa = require("../models/SiswaModel.js");
const SubModul = require("../models/SubModulModel.js");
const Modul = require("../models/ModulModel.js");
const { Op } = require("sequelize");

// Start or update progress when student accesses submodule
const startProgress = async (req, res) => {
  try {
    const { subModulId } = req.body;

    // Get siswa ID from user (assuming user.role === 'siswa')
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Get submodule data
    const subModul = await SubModul.findByPk(subModulId, {
      include: [{
        model: Modul,
        as: "modul"
      }]
    });

    if (!subModul) {
      return res.status(404).json({ msg: "Sub modul tidak ditemukan" });
    }

    // Check if progress already exists
    let progress = await StudentProgress.findOne({
      where: {
        siswaId: siswa.id,
        subModulId: subModulId
      }
    });

    const userId = req.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "User ID not found in the request" });
      }

    if (progress) {
      // Update last accessed time
      progress.lastAccessedAt = new Date();
      await progress.save();
    } else {
      // Create new progress
      progress = await StudentProgress.create({
        siswaId: siswa.id,
        subModulId: subModulId,
        modulId: subModul.modulId,
        isCompleted: false,
        lastAccessedAt: new Date(),
        userId: req.userId,
      });
    }

    res.status(200).json({
      msg: "Progress started/updated successfully",
      progress: progress
    });

  } catch (error) {
    console.error("Error starting progress:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Update watch time and completion percentage
const updateProgress = async (req, res) => {
  try {
    const { subModulId, watchTime, totalWatchTime, completionPercentage } = req.body;

    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Find existing progress
    let progress = await StudentProgress.findOne({
      where: {
        siswaId: siswa.id,
        subModulId: subModulId
      }
    });

    if (!progress) {
      return res.status(404).json({ msg: "Progress tidak ditemukan. Mulai progress terlebih dahulu." });
    }

    // Update progress data
    progress.watchTime = watchTime || progress.watchTime;
    progress.totalWatchTime = totalWatchTime || progress.totalWatchTime;
    progress.completionPercentage = completionPercentage || progress.completionPercentage;
    progress.lastAccessedAt = new Date();

    // Auto-complete if completion percentage >= 80%
    if (completionPercentage >= 80 && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    await progress.save();

    res.status(200).json({
      msg: "Progress updated successfully",
      progress: progress
    });

  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Mark submodule as completed
const markAsCompleted = async (req, res) => {
  try {
    const { subModulId, notes } = req.body;

    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Find existing progress
    let progress = await StudentProgress.findOne({
      where: {
        siswaId: siswa.id,
        subModulId: subModulId
      }
    });

    if (!progress) {
      return res.status(404).json({ msg: "Progress tidak ditemukan. Mulai progress terlebih dahulu." });
    }

    // Mark as completed
    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.completionPercentage = 100;
    progress.notes = notes || progress.notes;
    progress.lastAccessedAt = new Date();

    await progress.save();

    res.status(200).json({
      msg: "Sub modul berhasil ditandai sebagai selesai",
      progress: progress
    });

  } catch (error) {
    console.error("Error marking as completed:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Get student progress for specific module
const getStudentProgressByModule = async (req, res) => {
  try {
    const { modulId } = req.params;

    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Get all submodules for this module
    const subModules = await SubModul.findAll({
      where: { modulId },
      order: [['createdAt', 'ASC']],
      include: [{
        model: Modul,
        as: "modul"
      }]
    });

    if (subModules.length === 0) {
      return res.status(404).json({ msg: "Sub modul tidak ditemukan" });
    }

    // Get progress for each submodule
    const progressData = await Promise.all(
      subModules.map(async (subModule) => {
        const progress = await StudentProgress.findOne({
          where: {
            siswaId: siswa.id,
            subModulId: subModule.id
          }
        });

        return {
          subModul: subModule,
          progress: progress || {
            isCompleted: false,
            completionPercentage: 0,
            watchTime: 0,
            lastAccessedAt: null
          }
        };
      })
    );

    // Calculate overall module progress
    const totalSubModules = subModules.length;
    const completedSubModules = progressData.filter(item => 
      item.progress && item.progress.isCompleted
    ).length;
    const overallProgress = (completedSubModules / totalSubModules) * 100;

    res.status(200).json({
      modulId: modulId,
      totalSubModules: totalSubModules,
      completedSubModules: completedSubModules,
      overallProgress: Math.round(overallProgress),
      subModulesProgress: progressData
    });

  } catch (error) {
    console.error("Error getting student progress:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Get student progress for specific submodule
const getStudentProgressBySubModule = async (req, res) => {
  try {
    const { subModulId } = req.params;

    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Get progress
    const progress = await StudentProgress.findOne({
      where: {
        siswaId: siswa.id,
        subModulId: subModulId
      },
      include: [
        {
          model: SubModul,
          as: "subModul",
          include: [{
            model: Modul,
            as: "modul"
          }]
        }
      ]
    });

    if (!progress) {
      // Return default progress if not found
      const subModul = await SubModul.findByPk(subModulId, {
        include: [{
          model: Modul,
          as: "modul"
        }]
      });

      return res.status(200).json({
        subModul: subModul,
        progress: {
          isCompleted: false,
          completionPercentage: 0,
          watchTime: 0,
          lastAccessedAt: null
        }
      });
    }

    res.status(200).json({
      subModul: progress.subModul,
      progress: progress
    });

  } catch (error) {
    console.error("Error getting submodule progress:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Check if student can access next submodule
const checkAccess = async (req, res) => {
  try {
    const { currentSubModulId } = req.params;

    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Get current submodule
    const currentSubModul = await SubModul.findByPk(currentSubModulId);
    if (!currentSubModul) {
      return res.status(404).json({ msg: "Sub modul tidak ditemukan" });
    }

    // Get all submodules in the same module (ordered)
    const allSubModules = await SubModul.findAll({
      where: { modulId: currentSubModul.modulId },
      order: [['createdAt', 'ASC']]
    });

    // Find current index
    const currentIndex = allSubModules.findIndex(sm => sm.id === parseInt(currentSubModulId));
    
    if (currentIndex === -1) {
      return res.status(404).json({ msg: "Sub modul tidak ditemukan dalam urutan" });
    }

    // Check if this is the first submodule (always accessible)
    if (currentIndex === 0) {
      return res.status(200).json({
        canAccess: true,
        message: "Sub modul pertama dapat diakses",
        currentIndex: currentIndex,
        totalSubModules: allSubModules.length
      });
    }

    // Check if previous submodule is completed
    const previousSubModul = allSubModules[currentIndex - 1];
    const previousProgress = await StudentProgress.findOne({
      where: {
        siswaId: siswa.id,
        subModulId: previousSubModul.id
      }
    });

    const canAccess = previousProgress && previousProgress.isCompleted;

    res.status(200).json({
      canAccess: canAccess,
      message: canAccess 
        ? "Dapat mengakses sub modul ini" 
        : "Selesaikan sub modul sebelumnya terlebih dahulu",
      currentIndex: currentIndex,
      totalSubModules: allSubModules.length,
      previousSubModul: {
        id: previousSubModul.id,
        title: previousSubModul.subJudul,
        isCompleted: previousProgress ? previousProgress.isCompleted : false
      }
    });

  } catch (error) {
    console.error("Error checking access:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

// Get student's overall learning statistics
const getStudentStatistics = async (req, res) => {
  try {
    // Get siswa ID from user
    const siswa = await Siswa.findOne({
      where: { userId: req.userId }
    });

    if (!siswa) {
      return res.status(404).json({ msg: "Data siswa tidak ditemukan" });
    }

    // Get all progress data
    const allProgress = await StudentProgress.findAll({
      where: { siswaId: siswa.id },
      include: [
        {
          model: SubModul,
          as: "subModul",
          include: [{
            model: Modul,
            as: "modul"
          }]
        }
      ]
    });

    // Calculate statistics
    const totalSubModules = allProgress.length;
    const completedSubModules = allProgress.filter(p => p.isCompleted).length;
    const totalWatchTime = allProgress.reduce((sum, p) => sum + p.watchTime, 0);
    const averageCompletion = totalSubModules > 0 
      ? allProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / totalSubModules 
      : 0;

    // Get modules statistics
    const moduleStats = {};
    allProgress.forEach(progress => {
      const modulId = progress.modulId;
      if (!moduleStats[modulId]) {
        moduleStats[modulId] = {
          modulTitle: progress.subModul.modul.judul,
          totalSubModules: 0,
          completedSubModules: 0,
          totalWatchTime: 0
        };
      }
      moduleStats[modulId].totalSubModules++;
      if (progress.isCompleted) {
        moduleStats[modulId].completedSubModules++;
      }
      moduleStats[modulId].totalWatchTime += progress.watchTime;
    });

    res.status(200).json({
      totalSubModules: totalSubModules,
      completedSubModules: completedSubModules,
      overallProgress: totalSubModules > 0 ? (completedSubModules / totalSubModules) * 100 : 0,
      totalWatchTime: totalWatchTime,
      averageCompletion: Math.round(averageCompletion),
      moduleStatistics: Object.values(moduleStats)
    });

  } catch (error) {
    console.error("Error getting student statistics:", error);
    res.status(500).json({ 
      msg: "Internal Server Error", 
      error: error.message 
    });
  }
};

module.exports = {
  startProgress,
  updateProgress,
  markAsCompleted,
  getStudentProgressByModule,
  getStudentProgressBySubModule,
  checkAccess,
  getStudentStatistics
};