const { Sequelize } = require("sequelize");

const db = new Sequelize('db_lms', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
})

module.exports = db