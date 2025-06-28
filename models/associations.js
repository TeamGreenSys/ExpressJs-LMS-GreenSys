const Users = require("./UserModel");
const Guru = require("./GuruModel");
const Siswa = require("./SiswaModel");
const Kelas = require("./KelasModel");
const Modul = require("./ModulModel");
const SubModul = require("./SubModulModel");
const Certificate = require("./CertificateModel");
const StudentProgress = require("./StudentProgressModel");
const GroupSoal = require("./GroupSoalModel");
const Soal = require("./SoalModel");
const Nilai = require("./NilaiModel");
const NilaiSoal = require("./NilaiSoalModel");

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

  Users.hasMany(Certificate);
  Certificate.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(StudentProgress);
  StudentProgress.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(GroupSoal);
  GroupSoal.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(Soal);
  Soal.belongsTo(Users, { foreignKey: "userId" });

  Users.hasMany(Nilai);
  Nilai.belongsTo(Users, { foreignKey: "userId" });

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

  // Group Soal Associations
  Kelas.hasMany(GroupSoal, {
    foreignKey: "kelasId",
    onDelete: "CASCADE",
    hooks: true,
  });
  GroupSoal.belongsTo(Kelas, {
    foreignKey: "kelasId",
    as: "kelas",
    onDelete: "CASCADE",
    hooks: true,
  });

  // Soal Associations
  GroupSoal.hasMany(Soal, {
    foreignKey: "groupSoalId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Soal.belongsTo(GroupSoal, {
    foreignKey: "groupSoalId",
    as: "groupSoal",
    onDelete: "CASCADE",
    hooks: true,
  });

  // Nilai Associations
  Siswa.hasMany(Nilai, {
    foreignKey: "siswaId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Nilai.belongsTo(Siswa, {
    foreignKey: "siswaId",
    as: "siswa",
    onDelete: "CASCADE",
    hooks: true,
  });

  GroupSoal.hasMany(Nilai, {
    foreignKey: "groupSoalId",
    onDelete: "CASCADE",
    hooks: true,
  });
  Nilai.belongsTo(GroupSoal, {
    foreignKey: "groupSoalId",
    as: "groupSoal",
    onDelete: "CASCADE",
    hooks: true,
  });

  // NilaiSoal Associations
  Nilai.hasMany(NilaiSoal, {
    foreignKey: "nilaiId",
    onDelete: "CASCADE",
    hooks: true,
  });
  NilaiSoal.belongsTo(Nilai, {
    foreignKey: "nilaiId",
    as: "nilai",
    onDelete: "CASCADE",
    hooks: true,
  });

  Soal.hasMany(NilaiSoal, {
    foreignKey: "soalId",
    onDelete: "CASCADE",
    hooks: true,
  });
  NilaiSoal.belongsTo(Soal, {
    foreignKey: "soalId",
    as: "soal",
    onDelete: "CASCADE",
    hooks: true,
  });

}

module.exports = setupAssociations;