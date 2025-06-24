const { Sequelize } = require("sequelize");
const db = require("../config/Database.js");

const { DataTypes } = Sequelize;

const StudentProgress = db.define('student_progress', {
    siswaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    subModulId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    modulId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    watchTime: {
        type: DataTypes.INTEGER, // in seconds
        defaultValue: 0,
        allowNull: false
    },
    totalWatchTime: {
        type: DataTypes.INTEGER, // total duration in seconds
        defaultValue: 0,
        allowNull: false
    },
    completionPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
        allowNull: false,
        validate: {
            min: 0.0,
            max: 100.0
        }
    },
    lastAccessedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    freezeTableName: true,
    // Prevent duplicate progress for same siswa and submodul
    indexes: [
        {
            unique: true,
            fields: ['siswaId', 'subModulId']
        }
    ]
});

module.exports = StudentProgress;