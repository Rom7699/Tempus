import { AuthService } from './AuthService';
import { AppConfig } from '../config/app.config';

interface UploadResponse {
  message: string;
  userId: string;
  timestamp: string;
  files: {
    raw: string;
    latest: string;
    daily: string;
  };
  bucket: string;
}

interface UploadError {
  error: string;
  details?: string;
}

export class HealthUploadService {
  // Use API endpoint from config
  private static readonly API_ENDPOINT = AppConfig.API.HEALTH_UPLOAD_ENDPOINT;
  
  /**
   * Upload health data to S3 via Lambda
   */
  public static async uploadHealthData(
    userId: string,
    healthData: any
  ): Promise<UploadResponse> {
    try {
      console.log('[HealthUploadService] Starting upload for user:', userId);
      
      // Get JWT token for authentication (optional but recommended)
      const token = await AuthService.getJWTToken();
      
      // Prepare request headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token is available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Prepare request body
      const requestBody = {
        userId,
        healthData
      };
      
      console.log('[HealthUploadService] Uploading data to:', this.API_ENDPOINT);
      
      // Make the API call
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Check if request was successful
      if (!response.ok) {
        console.error('[HealthUploadService] Upload failed:', responseData);
        throw new Error((responseData as UploadError).error || 'Upload failed');
      }
      
      console.log('[HealthUploadService] Upload successful:', responseData);
      return responseData as UploadResponse;
      
    } catch (error) {
      console.error('[HealthUploadService] Upload error:', error);
      throw error;
    }
  }
  
  /**
   * Upload health data with retry logic
   */
  public static async uploadWithRetry(
    userId: string,
    healthData: any,
    maxRetries: number = 3
  ): Promise<UploadResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[HealthUploadService] Upload attempt ${attempt}/${maxRetries}`);
        
        const result = await this.uploadHealthData(userId, healthData);
        return result; // Success!
        
      } catch (error) {
        lastError = error as Error;
        console.error(`[HealthUploadService] Attempt ${attempt} failed:`, error);
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[HealthUploadService] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Upload failed after all retries');
  }
}