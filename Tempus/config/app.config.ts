export const AppConfig = {
  // API Endpoints
  API: {
    // IMPORTANT: Replace these with your actual values from AWS
    HEALTH_UPLOAD_ENDPOINT: 'https://wvk4e6zr55.execute-api.us-east-1.amazonaws.com/health-data',
    TASK_API_ENDPOINT: 'https://0olevx3qah.execute-api.us-east-1.amazonaws.com/task', // Your existing task API
  },
  
  // S3 Configuration
  S3: {
    BUCKET_NAME: 'tempus-user-health-uploads', 
    REGION: 'us-east-1', 
  },
  
  // Health Data Settings
  HEALTH_DATA: {
    DEFAULT_DAYS_TO_FETCH: 7,
    MAX_UPLOAD_RETRIES: 3,
    SYNC_INTERVAL_HOURS: 24, // For future auto-sync feature
  },
  
  // Feature Flags (for development)
  FEATURES: {
    ENABLE_HEALTH_SYNC: true,
    ENABLE_AUTO_SYNC: false, // Set to true when ready for auto-sync
    DEBUG_MODE: __DEV__, // Automatically true in development
  }
};

// Type definitions for better TypeScript support
export type ApiEndpoints = typeof AppConfig.API;
export type S3Config = typeof AppConfig.S3;
export type HealthDataConfig = typeof AppConfig.HEALTH_DATA;