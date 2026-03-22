import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';

const seedAdmin = async () => {
  await connectDatabase();

  const existingAdmin = await User.findOne({ username: env.adminUsername.toLowerCase() });

  if (existingAdmin) {
    console.log(`Admin ${env.adminUsername} already exists`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  await User.create({
    fullName: env.adminFullName,
    username: env.adminUsername.toLowerCase(),
    passwordHash,
    role: ROLES.ADMIN
  });

  console.log(`Admin ${env.adminUsername} created`);
  await mongoose.disconnect();
};

seedAdmin().catch(async (error) => {
  console.error('Failed to seed admin user', error);
  await mongoose.disconnect();
  process.exit(1);
});
