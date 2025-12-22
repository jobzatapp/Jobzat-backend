const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Candidate = sequelize.define('Candidate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    experience_years: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    salary_expectation: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    cv_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    video_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    profile_image_url: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'candidates',
    timestamps: false,
    underscored: true
});

module.exports = Candidate;

