import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';

const seedDemo = async () => {
  await connectDatabase();

  const demoUsername = 'demo';
  const existingDemo = await User.findOne({ username: demoUsername });

  if (existingDemo) {
    console.log(`Demo user '${demoUsername}' already exists`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash('demo123', 10);

  await User.create({
    fullName: 'Demo User',
    username: demoUsername,
    passwordHash,
    role: ROLES.DEMO,
    isActive: true
  });

  console.log(`Demo user '${demoUsername}' created successfully with password 'demo123'`);
  await mongoose.disconnect();
};

seedDemo().catch(async (error) => {
  console.error('Failed to seed demo user', error);
  await mongoose.disconnect();
  process.exit(1);
});

