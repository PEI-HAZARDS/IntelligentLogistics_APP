import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/services/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** If set, only users whose stored role matches one of these values may access the route. */
    allowedRoles?: string[];
}

/**
 * Route guard that:
 * 1. Redirects to /login if the user is not authenticated.
 * 2. Redirects away if the user's role is not in the allowed list.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            const role: string = userInfo.role || '';
            if (!allowedRoles.includes(role)) {
                // Wrong role — send back to login so they use the correct app
                return <Navigate to="/login" replace />;
            }
        } catch {
            return <Navigate to="/login" replace />;
        }
    }

    return <>{children}</>;
}
