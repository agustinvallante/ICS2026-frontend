import { Navigate } from 'react-router-dom';
import useAuth from '../hook/useAuth';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {

    if (!role || !allowedRoles.some((allowedRole) => allowedRole.trim().toLowerCase() === role)) {

      return <Navigate to='/' replace />;
    }
  }

  return children;
};

export default ProtectedRoute;