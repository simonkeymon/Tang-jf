import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { FullPageLoading } from '../components/LoadingStates';

export default function ProtectedRoute() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
