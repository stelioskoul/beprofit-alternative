import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

const connection = await mysql.createConnection(connectionString);
const db = drizzle(connection);

async function migrateUserAccount() {
  console.log('Starting user account migration...\n');
  
  const oldEmail = 'stelioskouloulias@gmail.com';
  const newEmail = 'business.kdgroup@gmail.com';
  const newPassword = '$KoulDoul1243';
  
  console.log(`Migrating account from ${oldEmail} to ${newEmail}...`);
  
  // Hash new password
  console.log('Hashing new password...');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  // Update user record
  await db.update(users)
    .set({ 
      email: newEmail,
      passwordHash: passwordHash,
      loginMethod: 'email'
    })
    .where(eq(users.email, oldEmail));
  
  console.log(`✅ Successfully migrated account to ${newEmail}`);
  console.log('All user data (stores, products, expenses, connections) preserved.');
  
  await connection.end();
}

migrateUserAccount().catch(console.error);
