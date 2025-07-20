const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const SubModul = db.define('sub_modul', {
    subJudul: {
        type: DataTypes.STRING
    },
    subDeskripsi: {
        type: DataTypes.STRING
    },
    urlYoutube: {
        type: DataTypes.STRING,
        allowNull: false
    },
    time: {
        type: DataTypes.STRING,
        allowNull: true
    },
    namaPdf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    urlPdf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    modulId: {
        type: DataTypes.INTEGER
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

module.exports = SubModul