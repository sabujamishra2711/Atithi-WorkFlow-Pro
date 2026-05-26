import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MONGODB Connected !! DB HOST : ${connectionInstance.connection.host}`);
        console.log(`📊 Database: ${connectionInstance.connection.name}`);
    } catch (error) {
        console.error("❌ MONGODB Connection Failed:", error.message);
        console.log("🔄 Continuing without database connection...");
    }
} 

export default connectDB;