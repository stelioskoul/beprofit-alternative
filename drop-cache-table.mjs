import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

await connection.query('DROP TABLE IF EXISTS cached_metrics');
console.log('✓ Dropped cached_metrics table');

await connection.query(`
CREATE TABLE cached_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storeId INT NOT NULL,
  date VARCHAR(10) NOT NULL,
  metricsData JSON NOT NULL,
  lastRefreshedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY uniqueStoreDate (storeId, date)
)`);
console.log('✓ Created new cached_metrics table with day-based schema');

await connection.end();
