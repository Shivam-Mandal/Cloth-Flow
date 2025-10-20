import { useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    // Mock authentication - in production, this would call an API
    if (email === 'admin@company.com' && password === 'admin123') {
      setUser({
        id: '1',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      });
    } else if (email === 'worker@company.com' && password === 'worker123') {
      setUser({
        id: '2',
        name: 'Worker User',
        email: 'worker@company.com',
        role: 'worker'
      });
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout };
};
