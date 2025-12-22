'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('job_applications', 'created_at', {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    });
    await queryInterface.addColumn('job_applications', 'updated_at', {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('job_applications', 'created_at');
    await queryInterface.removeColumn('job_applications', 'updated_at');
  }
};
