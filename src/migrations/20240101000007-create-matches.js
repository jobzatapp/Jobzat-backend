'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('matches', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            job_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'jobs',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            candidate_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'candidates',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            match_score: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            match_summary: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'shortlisted', 'rejected'),
                allowNull: false,
                defaultValue: 'pending'
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Create unique index on job_id and candidate_id
        await queryInterface.addIndex('matches', ['job_id', 'candidate_id'], {
            unique: true,
            name: 'matches_job_candidate_unique'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('matches');
    }
};

