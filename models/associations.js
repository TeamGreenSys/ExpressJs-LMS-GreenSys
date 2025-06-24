const Users = require("./UserModel");
const Guru = require("./GuruModel");
const Siswa = require("./SiswaModel");
const Kelas = require("./KelasModel");
const Modul = require("./ModulModel");
const SubModul = require("./SubModulModel");
const Certificate = require("./CertificateModel");
const StudentProgress = require("./StudentProgressModel"); // ✅ Import model baru

function setupAssociations() {
  // User Associations
  Users.hasMany(Guru);
  Guru.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(Siswa);
  Siswa.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(Kelas);
  Kelas.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(Modul);
  Modul.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(SubModul);
  SubModul.belongsTo(Users, { foreignKey: "userId" });

  // Kelas Associations
  Kelas.hasMany(Siswa, {
    foreignKey: "kelasId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Siswa.belongsTo(Kelas, {
    foreignKey: "kelasId",
    as: "kelas",
    onDelete: "CASCADE",
    hooks: true,
  });

  // SubModul Associations
  Modul.hasMany(SubModul, {
    foreignKey: "modulId",
    onDelete: "CASCADE",
    hooks: true,
  });
  SubModul.belongsTo(Modul, {
    foreignKey: "modulId",
    as: "modul",
    onDelete: "CASCADE",
    hooks: true,
  });

  // Certificate Associations
  Modul.hasMany(Certificate, {
    foreignKey: "modulId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Certificate.belongsTo(Modul, {
    foreignKey: "modulId",
    as: "modul",
    onDelete: "CASCADE",
    hooks: true,
  });

  Siswa.hasMany(Certificate, {
    foreignKey: "siswaId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Certificate.belongsTo(Siswa, {
    foreignKey: "siswaId",
    as: "siswa",
    onDelete: "CASCADE",
    hooks: true,
  });

  // ✅ NEW: StudentProgress Associations
  Siswa.hasMany(StudentProgress, {
    foreignKey: "siswaId",
    onDelete: "CASCADE",
    hooks: true,
  });
  StudentProgress.belongsTo(Siswa, {
    foreignKey: "siswaId",
    as: "siswa",
    onDelete: "CASCADE",
    hooks: true,
  });

  SubModul.hasMany(StudentProgress, {
    foreignKey: "subModulId",
    onDelete: "CASCADE",
    hooks: true,
  });
  StudentProgress.belongsTo(SubModul, {
    foreignKey: "subModulId",
    as: "subModul",
    onDelete: "CASCADE",
    hooks: true,
  });

  Modul.hasMany(StudentProgress, {
    foreignKey: "modulId",
    onDelete: "CASCADE",
    hooks: true,
  });
  StudentProgress.belongsTo(Modul, {
    foreignKey: "modulId",
    as: "modul",
    onDelete: "CASCADE",
    hooks: true,
  });
}

module.exports = setupAssociations;