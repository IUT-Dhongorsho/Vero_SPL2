// Mock auth service for frontend-only development
// Replace with real API calls when backend is ready

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  githubHandle?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  githubHandle?: string;
  avatar?: string;
}

// Mock user for demo
const MOCK_USER: User = {
  id: '1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  githubHandle: 'janedoe',
};

export const authService = {
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple validation for demo
    if (!data.email || !data.password) {
      throw new Error('Please fill in all fields');
    }
    
    if (data.password.length < 3) {
      throw new Error('Invalid credentials');
    }
    
    // Return mock data
    return {
      user: { ...MOCK_USER, email: data.email },
      token: 'mock_jwt_token_' + Date.now(),
    };
  },
  
  async signup(data: SignupData): Promise<{ user: User; token: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple validation for demo
    if (!data.name || !data.email || !data.password) {
      throw new Error('Please fill in all required fields');
    }
    
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    // Return mock data
    return {
      user: {
        id: '1',
        name: data.name,
        email: data.email,
        githubHandle: data.githubHandle,
      },
      token: 'mock_jwt_token_' + Date.now(),
    };
  },
  
  async logout(): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },
  
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
  
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },
  
  removeToken(): void {
    localStorage.removeItem('auth_token');
  },
  
  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
  
  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
