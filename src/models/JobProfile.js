const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobProfile = sequelize.define('JobProfile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    job_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'jobs',
            key: 'id'
        },
        unique: true
    },
    skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'job_profiles',
    timestamps: false,
    underscored: true
});

module.exports = JobProfile;

