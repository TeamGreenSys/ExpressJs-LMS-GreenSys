const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const Nilai = db.define('nilai', {
    skor: {
        type: DataTypes.DECIMAL(5,2),
        allowNull: false,
        validate: {
            min: 0,
            max: 100
        }
    },
    jumlahJawabanBenar: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    jumlahSoal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Total soal dalam quiz'
    },
    siswaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    groupSoalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    }
}, {
    freezeTableName: true
});

module.exports = Nilai;