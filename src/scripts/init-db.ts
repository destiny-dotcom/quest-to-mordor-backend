import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import logger from '../utils/logger';

const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, '../migrations');

  logger.info('Starting database initialization...');

  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      logger.info(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await pool.query(sql);
      logger.info(`Completed: ${file}`);
    }

    logger.info('All migrations completed successfully!');
    logger.info('Your quest to Mordor database is ready!');

    const milestoneCount = await pool.query('SELECT COUNT(*) FROM milestones');
    const achievementCount = await pool.query('SELECT COUNT(*) FROM achievements');

    logger.info(`Milestones loaded: ${milestoneCount.rows[0].count}`);
    logger.info(`Achievements loaded: ${achievementCount.rows[0].count}`);

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
