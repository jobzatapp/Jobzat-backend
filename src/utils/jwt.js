const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
    // const payload = {
    //     userId: userData.id,
    //     email: userData.email,
    //     role: userData.role,
    //     name: userData.name || null
    // };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };

