const { Sequelize } = require("sequelize");

const db = new Sequelize('db_lms', process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST_IP,
    port: 3306,
    dialect: 'mysql'
})

module.exports = db
