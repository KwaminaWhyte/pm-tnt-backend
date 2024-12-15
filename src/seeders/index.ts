import mongoose from 'mongoose';
import { seedSampleData } from './sampleData';

async function runSeeders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tnt-backend');
    console.log('Connected to MongoDB');

    // Run seeders
    await seedSampleData();

    console.log('All seeders completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running seeders:', error);
    process.exit(1);
  }
}

runSeeders();
