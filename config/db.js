// const mongoose = require("mongoose");
// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log("MongoDB connected successfully!! ");
//     } catch (error) {
//         console.error("Mongodb connection failed", error);
//         // process.exit();        
//     }
// };

// module.exports = connectDB;

const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    // If already connected, return early
    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }

    try {
        // Check if MONGO_URI exists
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI environment variable is not defined");
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        isConnected = true;
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        isConnected = false;
        // Don't exit process in serverless environment
        throw error;
    }
};

module.exports = connectDB;