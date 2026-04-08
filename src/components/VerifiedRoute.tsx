import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";

/**
 * Wraps protected routes to require email verification.
 * If user is not verified, redirect to /verify-email.
 * OAuth users (Google/Apple) are auto-verified.
 */
const VerifiedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { profile, isLoading } = useProfile();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gold animate-pulse font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // OAuth users (Google/Apple) are auto-verified
  const isOAuth = user.app_metadata?.provider && user.app_metadata.provider !== "email";
  
  if (!isOAuth && profile && !profile.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default VerifiedRoute;
