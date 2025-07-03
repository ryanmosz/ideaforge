import axios, { AxiosInstance, AxiosError } from 'axios';
import { N8nConfig, N8nResponse } from '../types/n8n-types';
import { getN8nConfig } from '../config/n8n-config';

/**
 * Client for communicating with n8n webhooks
 */
export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;
  
  constructor(config?: Partial<N8nConfig>) {
    // Merge provided config with environment config
    this.config = {
      ...getN8nConfig(),
      ...config
    };
    
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.webhookPath}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      }
    });
    
    this.setupInterceptors();
  }
  
  /**
   * Set up request and response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[N8n Client] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[N8n Client] Request error:', error.message);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[N8n Client] Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        if (error.code === 'ECONNABORTED') {
          console.error('[N8n Client] Request timeout');
          throw new Error('Request timeout - n8n webhook did not respond');
        }
        
        if (error.response) {
          console.error(`[N8n Client] Error response: ${error.response.status} - ${error.response.statusText}`);
          if (error.response.status === 401) {
            throw new Error('Unauthorized - check your N8N_API_KEY');
          }
          if (error.response.status === 404) {
            throw new Error('Webhook not found - ensure n8n workflows are activated');
          }
        } else if (error.request) {
          console.error('[N8n Client] No response received');
          throw new Error('No response from n8n - check if n8n is running');
        } else {
          console.error('[N8n Client] Error:', error.message);
        }
        
        throw error;
      }
    );
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): Readonly<N8nConfig> {
    return { ...this.config };
  }
  
  /**
   * Test connectivity to n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/ideaforge/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
  
  // /**
  //  * Create metadata for requests
  //  */
  // private createMetadata() {
  //   return {
  //     timestamp: Date.now(),
  //     version: '1.0.0',
  //     source: 'langgraph-agent'
  //   };
  // }
  
  /**
   * Make a POST request to an n8n webhook
   */
  protected async post<T>(endpoint: string, data: any): Promise<N8nResponse<T>> {
    try {
      const response = await this.client.post<N8nResponse<T>>(endpoint, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Make a GET request to an n8n webhook
   */
  protected async get<T>(endpoint: string): Promise<N8nResponse<T>> {
    try {
      const response = await this.client.get<N8nResponse<T>>(endpoint);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Handle errors and return a consistent error response
   */
  private handleError(error: any): N8nResponse<any> {
    console.error('[N8n Client] Error:', error);
    
    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
      metadata: {
        cached: false,
        requestDuration: 0
      }
    };
  }
} 