import mongoose from "mongoose"
import { Env } from "./env.config"
import { logger } from "../utils/logger";

const connectDatabase = async () => {
    try {
        await mongoose.connect(Env.MONGO_URI);
        logger.info(`Connected to Mongo Database`);
    } catch (error) {
        logger.info(`Error connecting to Mongo Database - ${error}`);
        process.exit(1); 
    }
}

const disconnectDatabase = async () => {
    try {
        await mongoose.disconnect();
        logger.info(`Disconnected from Mongo Database`);
    } catch (error) {
        logger.info(`Error disconnecting from Mongo Database - ${error}`);
        process.exit(1); 
    }
}

export { connectDatabase, disconnectDatabase }