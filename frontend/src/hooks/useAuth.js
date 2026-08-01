import { useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);

  const login = () => {
    throw new Error('useAuth mock login has been removed. Use UserContext authentication.');
  };

  const logout = () => {
    setUser(null);
  };

  return { user, login, logout };
};
