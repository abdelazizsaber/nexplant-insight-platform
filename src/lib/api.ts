
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Type definitions for API responses
interface LoginResponse {
  user: {
    username: string;
    role: string;
    company_id: number | null;
  };
  message: string;
}

interface SessionResponse {
  user: {
    username: string;
    role: string;
    company_id: number | null;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include session cookies
      ...options,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired, redirect to login
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication endpoints
  async login(username: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async checkSession(): Promise<SessionResponse> {
    return this.request<SessionResponse>('/api/auth/check', {
      method: 'GET',
    });
  }

  // Admin endpoints
  async createCompany(companyData: {
    name: string;
    email: string;
    country_code: string;
    description?: string;
  }) {
    return this.request('/api/admin/create_company', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async registerDevice(deviceData: {
    company_id: string;
    entity_name: string;
    device_name: string;
    device_id: string;
    device_type: string;
    description?: string;
  }) {
    return this.request('/api/admin/register_device', {
      method: 'POST',
      body: JSON.stringify(deviceData),
    });
  }

  async deactivateCompany(companyId: string) {
    return this.request('/api/admin/delete_company', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId }),
    });
  }

  // Data fetching endpoints
  async getCompanies() {
    return this.request('/api/companies');
  }

  async getUsers(companyId?: string) {
    const endpoint = companyId ? `/api/users?company_id=${companyId}` : '/api/users';
    return this.request(endpoint);
  }

  async getDevices(companyId?: string) {
    const endpoint = companyId ? `/api/devices?company_id=${companyId}` : '/api/devices';
    return this.request(endpoint);
  }

  async getEntities(companyId: string) {
    return this.request(`/api/entities?company_id=${companyId}`);
  }

  async getDeviceData(deviceId: string, startDate?: string, endDate?: string) {
    let endpoint = `/api/device-data/${deviceId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) endpoint += `?${params.toString()}`;
    
    return this.request(endpoint);
  }

  // Create user endpoint
  async createUser(userData: {
    username: string;
    password: string;
    company_id: string;
    role: string;
  }) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Create entity endpoint
  async createEntity(entityData: {
    company_id: string;
    entity_name: string;
    entity_location: string;
    entity_description?: string;
  }) {
    return this.request('/api/entities', {
      method: 'POST',
      body: JSON.stringify(entityData),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
