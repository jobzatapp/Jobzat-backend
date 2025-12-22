const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CandidateProfile = sequelize.define('CandidateProfile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    candidate_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'candidates',
            key: 'id'
        },
        unique: true
    },
    skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    languages: {
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
    tableName: 'candidate_profiles',
    timestamps: false,
    underscored: true
});

module.exports = CandidateProfile;

