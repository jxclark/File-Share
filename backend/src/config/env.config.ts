import { getEnv } from "../utils/get-env";


const envConfig = () => ({
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    PORT: getEnv('PORT', '3000'),

    BASE_PATH: getEnv('BASE_PATH', '/api'),
    MONGO_URI: getEnv('MONGO_URI', ''),

    JWT_SECRET: getEnv('JWT_SECRET', 'secret_jwt'),
    JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '1d'),
    
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
    ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS', '').split(','), // Provide a default value

    // LOGTAIL_SOURCE_TOKEN: getEnv('LOGTAIL_SOURCE_TOKEN', ''),
    // LOGTAIL_INGESTING_HOST: getEnv('LOGTAIL_INGESTING_HOST'),
})

export const Env = envConfig()