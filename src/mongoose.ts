import mongoose from "mongoose";

//  Connect to the database
mongoose.connect(process.env.MONGODB_URI as string);

// Get the default connection
const db = mongoose.connection;

// Event handlers for successful and failed connection
db.on("connected", () => {
  console.log(`Connected to MongoDB`);
});

db.on("error", (error) => {
  console.error(`Error connecting to MongoDB: ${error}`);
});

// Export the connected mongoose instance
export default mongoose;
