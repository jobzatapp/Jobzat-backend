'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('jobs', 'requirements', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('jobs', 'work_type', {
      type: Sequelize.ENUM('remote', 'hybrid', 'onsite'),
      allowNull: false
    });

    await queryInterface.addColumn('jobs', 'location', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('jobs', 'requirements');
    await queryInterface.removeColumn('jobs', 'work_type');
    await queryInterface.removeColumn('jobs', 'location');
  }
};
