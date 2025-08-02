const { Sequelize } = require("sequelize");

const db = new Sequelize('db_lms', 'admin_greensys', 'greensys', {
    host: '31.97.49.141',
    dialect: 'mysql'
})

module.exports = db