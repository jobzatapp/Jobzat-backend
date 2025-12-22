const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Job = sequelize.define('Job', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    employer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'employers',
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    required_years: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    required_skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    salary_range: {
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
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    work_type: {
        type: DataTypes.ENUM('remote', 'hybrid', 'onsite'),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'jobs',
    timestamps: false,
    underscored: true
});

module.exports = Job;

