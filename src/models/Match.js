const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
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
        }
    },
    candidate_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'candidates',
            key: 'id'
        }
    },
    match_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 100
        }
    },
    match_summary: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'shortlisted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
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
    tableName: 'matches',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['job_id', 'candidate_id']
        }
    ]
});

module.exports = Match;

