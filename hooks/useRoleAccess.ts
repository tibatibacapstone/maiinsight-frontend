import { useEffect, useState } from "react";
import {
  getStoredRole,
  getStoredToken,
  canAccessPage,
  canAccessFeature,
  UserRole,
  normalizeRole,
} from "@/lib/roles";

export interface UseRoleAccessResult {
  userRole: UserRole | null;
  token: string | null;
  isReady: boolean;
  canAccess: (page: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

/**
 * Hook for accessing user role and permission information
 * Handles lazy loading and role normalization
 */
export function useRoleAccess(): UseRoleAccessResult {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      setIsReady(true);
      return;
    }

    const role = getStoredRole();
    const storedToken = getStoredToken();

    setUserRole(role);
    setToken(storedToken);
    setIsReady(true);
  }, []);

  return {
    userRole,
    token,
    isReady,
    canAccess: (page: string) => canAccessPage(userRole, page),
    canAccessFeature: (feature: string) => {
      const access = canAccessFeature(userRole, feature);
      return access;
    },
    hasRole: (roles: UserRole | UserRole[]) => {
      if (!userRole) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(userRole);
    },
  };
}
