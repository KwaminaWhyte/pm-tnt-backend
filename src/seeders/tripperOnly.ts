import mongoose from "mongoose";
import { seedTripperPosts } from "./tripperPosts.seeder";

async function runTripperSeeder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pm-tnt"
    );
    console.log("Connected to MongoDB");

    // Run tripper posts seeder
    await seedTripperPosts();

    console.log("Tripper posts seeder completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error running tripper seeder:", error);
    process.exit(1);
  }
}

runTripperSeeder();
