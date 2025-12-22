const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JobApplication = sequelize.define('JobApplication', {
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
    job_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'jobs',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('accepted', 'rejected'),
        allowNull: false,
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
    tableName: 'job_applications',
    timestamps: false,
    underscored: true
});

module.exports = JobApplication;

