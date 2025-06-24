const Users = require("../models/UserModel.js")
const jwt = require("jsonwebtoken");

const verifyUser = async (req, res, next) => {
    try {
        // Ambil token dari header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ msg: "No token, authorization denied" });
        }

        // Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);

        // Cari user berdasarkan ID dari token
        const user = await Users.findOne({
            where: {
                uuid: decoded.userId,
            },
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

        // Simpan data user ke request untuk digunakan middleware berikutnya
        req.userId = user.id;
        req.userUuid = user.uuid;
        req.role = user.role;
        next();
    } catch (error) {
        return res.status(401).json({ msg: "Token tidak valid" });
    }
};


const adminOnly = async (req, res, next) => {
    const user = await Users.findOne({
        where: {
            uuid: req.userUuid
        }
    })
    if (!user) return res.status(404).json({msg: "User tidak ditemukan"})
    if (user.role !== "admin") return res.status(403).json({msg: "Khusus Admin"})
    next()
}

const guruOnly = async (req, res, next) => {
    const user = await Users.findOne({
        where: {
            uuid: req.userUuid
        }
    });

    if (!user) return res.status(404).json({msg: "User tidak ditemukan"});

    if (user.role !== "guru") return res.status(403).json({msg: "Khusus Guru"});

    next();
};

const isSiswa = async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    if (user.role !== "siswa") {
      return res.status(403).json({ msg: "Access denied. Only students can access this resource." });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

module.exports = {
    verifyUser,
    adminOnly,
    guruOnly,
    isSiswa
};