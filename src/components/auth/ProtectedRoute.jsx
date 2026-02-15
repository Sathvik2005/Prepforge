import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    console.log('[ProtectedRoute] Auth status:', { isAuthenticated, user: user?.email });
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
