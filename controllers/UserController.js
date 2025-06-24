const Users = require("../models/UserModel.js");
const argon = require("argon2");
const jwt = require('jsonwebtoken');
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

const getUsers = async(req, res) => {
    try {
        const response = await Users.findAll({
            attributes: ['uuid', 'username', 'email', 'role']
        })
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({msg: error.message})
    }
}

const getUsersById = async(req, res) => {
    try {
        const response = await Users.findOne({
            attributes: ['uuid', 'username', 'email', 'role'],
            where: {
                uuid: req.params.id
            }
        })
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json({msg: error.message})
    }
}

const createUsers = async (req, res) => {
    const { username, email, password, confPassword, role } = req.body;

    // Cek apakah password dan confirm password cocok
    if (password !== confPassword) {
        return res.status(400).json({ msg: "Password dan confirm password tidak cocok" });
    }

    try {
        // Cek apakah username sudah ada di database
        const existingUser = await Users.findOne({ where: { username: username } });
        if (existingUser) {
            return res.status(400).json({ msg: "Username sudah terdaftar" });
        }

        // Hash password
        const hashPassword = await argon.hash(password);

        // Buat pengguna baru
        await Users.create({
            username: username,
            email: email,
            password: hashPassword,
            role: role,
        });

        res.status(201).json({ msg: "Register berhasil!" });
    } catch (error) {
        res.status(400).json({ msg: error.message });
    }
};

const updateUsers = async(req, res) =>{
    const user = await Users.findOne({
        where: {
            uuid: req.params.id
        }
    });
    if(!user) return res.status(404).json({msg: "User tidak ditemukan"});

    const {
        username = user.username,
        email = user.email,
        password = "",
        confPassword = "",
        role = user.role,
    } = req.body;

    let hashPassword;
    if (!password || password === "") {
        // Gunakan password lama jika password tidak diubah
        hashPassword = user.password;
    } else {
        // Hash password baru
        if (password !== confPassword) {
            return res
                .status(400)
                .json({ msg: "Password dan Confirm Password tidak cocok" });
        }
        hashPassword = await argon.hash(password);
    }
    
    try {
        await Users.update({
            username: username,
            email: email,
            password: hashPassword,
            role: role
        },{
            where:{
                id: user.id
            }
        });
        res.status(200).json({msg: "User Updated"});
    } catch (error) {
        res.status(400).json({msg: error.message});
    }
}

const changePassword = async(req, res) => {
    try {
        // Mendapatkan id user dari token JWT yang sudah diverifikasi di middleware
        const userId = req.userId;
        
        // Mendapatkan data dari request body
        const { oldPassword, newPassword, confNewPassword } = req.body;
        
        // Validasi input
        if (!oldPassword || !newPassword || !confNewPassword) {
            return res.status(400).json({ 
                msg: "Semua field harus diisi" 
            });
        }
        
        // Cek apakah password baru dan konfirmasi password sama
        if (newPassword !== confNewPassword) {
            return res.status(400).json({ 
                msg: "Password baru dan konfirmasi password tidak cocok" 
            });
        }
        
        // Cari user berdasarkan id
        const user = await Users.findOne({
            where: {
                id: userId
            }
        });
        
        if (!user) {
            return res.status(404).json({ 
                msg: "User tidak ditemukan" 
            });
        }
        
        // Verifikasi password lama
        const validPassword = await argon.verify(user.password, oldPassword);
        if (!validPassword) {
            return res.status(400).json({ 
                msg: "Password lama tidak valid" 
            });
        }
        
        // Jika password lama valid, hash password baru
        const hashNewPassword = await argon.hash(newPassword);
        
        // Update password user
        await Users.update(
            { password: hashNewPassword },
            {
                where: {
                    id: userId
                }
            }
        );
        
        res.status(200).json({ 
            msg: "Password berhasil diubah" 
        });
        
    } catch (error) {
        res.status(500).json({ 
            msg: error.message 
        });
    }
};

const deleteUsers = async(req, res) => {
    const user = await Users.findOne({
        where: {
            uuid: req.params.id
        }
    })
    if (!user) return res.status(404).json({msg: "User tidak ditemukan"})
    try {
        await Users.destroy({
            where:{
                id: user.id
            }
        })
        res.status(200).json({msg: "User Deleted"})
    } catch (error) {
        res.status(400).json({msg: error.message})
    }
}

const sendLinkResetPassword = async (req, res) => {
    try {
        // Load environment variables
        dotenv.config();

        // Get email from request body
        const { email } = req.body;

        // Validate email input
        if (!email) {
            return res.status(400).json({ msg: "Email harus diisi" });
        }

        // Find user by email
        const user = await Users.findOne({
            where: {
                email: email.toLowerCase().trim() // Normalize email
            }
        });

        // Check if user exists
        if (!user) {
            return res.status(404).json({ msg: "Email tidak terdaftar" });
        }

        // Generate token for password reset
        // Token will be valid for 1 hour (3600 seconds)
        const token = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        // Create reset URL
        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        // Configure email transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.APP_PASSWORD,
            },
            // Add these options for better email delivery
            secure: true,
            requireTLS: true,
        });

        // Read email template
        const htmlTemplatePath = path.join(__dirname, '../html/email_template.html');
        const htmlContent = fs.readFileSync(htmlTemplatePath, 'utf-8');
        
        // Customize HTML template with reset link
        const customizedHtml = htmlContent.replace('{{linkReset}}', resetURL);

        // Email content
        const mailOptions = {
            from: "support@sma1lhokseumawe",
            to: email,
            subject: 'Reset Kata Sandi',
            html: customizedHtml,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            msg: "Tautan reset kata sandi telah dikirim ke email Anda"
        });

    } catch (error) {
        console.error('Error sending reset password link:', error);
        res.status(500).json({
            msg: "Terjadi kesalahan saat mengirim tautan reset kata sandi",
            error: error.message
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        // Get token and new password data from request body
        const { token, newPassword, confNewPassword } = req.body;

        // Validate input
        if (!token || !newPassword || !confNewPassword) {
            return res.status(400).json({ 
                msg: "Semua field harus diisi" 
            });
        }

        // Check if new password and confirmation match
        if (newPassword !== confNewPassword) {
            return res.status(400).json({ 
                msg: "Password baru dan konfirmasi password tidak cocok" 
            });
        }

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    msg: "Token telah kedaluwarsa. Silakan meminta link reset password baru" 
                });
            }
            return res.status(401).json({ 
                msg: "Token tidak valid" 
            });
        }

        // Get user ID from decoded token
        const userId = decoded.userId;

        // Find user by ID
        const user = await Users.findOne({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ 
                msg: "User tidak ditemukan" 
            });
        }

        // Hash the new password
        const hashPassword = await argon.hash(newPassword);

        // Update user's password
        await Users.update(
            { password: hashPassword },
            { where: { id: userId } }
        );

        res.status(200).json({ 
            msg: "Password berhasil diubah" 
        });

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ 
            msg: "Terjadi kesalahan saat mengubah password", 
            error: error.message 
        });
    }
};

module.exports = {
    getUsers,
    getUsersById,
    createUsers,
    updateUsers,
    changePassword,
    deleteUsers,
    sendLinkResetPassword,
    resetPassword
};