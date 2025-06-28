const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const NilaiSoal = db.define('nilai_soal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nilaiId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'nilai',
            key: 'id'
        }
    },
    soalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'soal',
            key: 'id'
        }
    },
    jawaban: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Jawaban yang dipilih oleh siswa'
    },
    benar: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Apakah jawaban benar atau salah'
    }
}, {
    freezeTableName: true,
    timestamps: true
});

module.exports = NilaiSoal;