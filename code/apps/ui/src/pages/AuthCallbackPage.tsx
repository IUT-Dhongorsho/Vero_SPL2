import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeAuth = async () => {
      try {
        const provider = searchParams.get('provider');
        const token = searchParams.get('token');

        if (!provider || !token) {
          throw new Error('Invalid authentication response.');
        }

        // Fake retrieving user profile from the social provider
        const mockUser = {
          id: uuidv4(),
          name: `${provider} User`,
          email: `user@${provider}.com`,
        };

        // Store JWT and User data locally
        authService.setToken(token);
        authService.setUser(mockUser);

        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
      }
    };

    completeAuth();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-center max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Failed</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-lg font-medium text-foreground">Completing sign-in...</h2>
      <p className="text-sm text-muted-foreground mt-1">Please wait while we secure your session.</p>
    </div>
  );
};
