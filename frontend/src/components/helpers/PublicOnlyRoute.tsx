import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PublicOnlyRouteProps {
    children: ReactNode;
}

/**
 * Wraps public-only pages (e.g. /login, /register).
 * If the user is already authenticated they are redirected to /dashboard.
 */
const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/profile" replace />;
    }

    return <>{children}</>;
};

export default PublicOnlyRoute;
