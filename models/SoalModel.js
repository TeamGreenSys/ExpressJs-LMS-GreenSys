const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const Soal = db.define('soal', {
    soal: {
        type: DataTypes.TEXT
    },
    optionA: {
        type: DataTypes.STRING
    },
    optionB: {
        type: DataTypes.STRING
    },
    optionC: {
        type: DataTypes.STRING
    },
    optionD: {
        type: DataTypes.STRING
    },
    optionE: {
        type: DataTypes.STRING
    },
    correctAnswer: {
        type: DataTypes.STRING
    },
    groupSoalId: {
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

module.exports = Soal