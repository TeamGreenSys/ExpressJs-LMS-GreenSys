const Users = require("../models/UserModel.js");
const argon = require("argon2");
const jwt = require('jsonwebtoken');

const Login = async(req, res) => {
    try {
        const user = await Users.findOne({
            where: {
                username: req.body.username
            }
        });
        
        if (!user) return res.status(404).json({msg: "User tidak ditemukan"});
        
        const match = await argon.verify(user.password, req.body.password);
        if (!match) return res.status(400).json({msg: "Password Salah"});
        
        // Create JWT token
        const token = jwt.sign({
            userId: user.uuid,
            username: user.username,
            role: user.role
        }, process.env.JWT_SECRET_ADMIN, {
            expiresIn: '24h' // Token expires in 24 hours
        });

        // Send user data and token
        res.status(200).json({
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            role: user.role,
            accessToken: token // Include the token in response
        });
    } catch (error) {
        res.status(500).json({msg: "Server Error", error: error.message});
    }
}

const Me = async(req, res) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({msg: "No token, authorization denied"});
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        
        const user = await Users.findOne({
            attributes: ['uuid', 'username', 'email', 'role'],
            where: {
                uuid: decoded.userId
            }
        });

        if (!user) return res.status(404).json({msg: "User tidak ditemukan"});
        
        res.status(200).json(user);
    } catch (error) {
        return res.status(401).json({msg: "Token tidak valid"});
    }
}

const logOut = (req, res) => {
    // For token-based auth, client just needs to remove the token
    res.status(200).json({msg: "Anda telah logout"});
}

module.exports = {
    Login,
    Me,
    logOut
};