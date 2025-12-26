const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CandidateEducation = sequelize.define('CandidateEducation', {
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
        }
    },
    school_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    degree: {
        type: DataTypes.STRING,
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
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
    tableName: 'candidate_educations',
    timestamps: false,
    underscored: true
});

module.exports = CandidateEducation;