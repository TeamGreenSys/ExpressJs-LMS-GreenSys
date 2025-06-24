const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const Certificate = db.define('certificate', {
    siswaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    modulId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    certificateFile: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    certificateUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    tanggalDiterbitkan: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        validate:{
            notEmpty: true
        }
    }
}, {
    freezeTableName: true,
    // Prevent duplicate certificate for same siswa and modul
    indexes: [
        {
            unique: true,
            fields: ['siswaId', 'modulId']
        }
    ]
});

module.exports = Certificate