const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const GroupSoal = db.define('group_soal', {
    judul: {
        type: DataTypes.STRING
    },
    durasi: {
        type: DataTypes.INTEGER
    },
    kelasId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        validate:{
            notEmpty: true
        }
    }
}, {
    freezeTableName: true
});

module.exports = GroupSoal