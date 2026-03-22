import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/services/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Route guard that redirects to /login if the user is not authenticated.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
