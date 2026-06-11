/**
 * Role Management System
 * Centralized role definitions and access control
 */

export const USER_ROLES = {
  ADMIN: "admin",
  MANAGEMENT: "management",
  MARKETING: "marketing",
  IT_SUPPORT: "it_support",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Page access permissions by role
 */
export const PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["dashboard", "data", "history", "notifications", "settings"],
  marketing: ["dashboard", "segments", "performance", "genai", "notifications"],
  management: ["dashboard", "segments", "performance", "genai", "notifications", "reports"],
  it_support: ["dashboard", "data", "history", "notifications"],
};

/**
 * Feature access permissions by role
 */
export const FEATURE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  admin: {
    uploadCsv: true,
    deleteImport: true,
    generateAiStrategy: true,
    manageUsers: true,
    viewActivityLogs: true,
    modifySettings: true,
    viewReports: true,
    downloadPdf: true,
  },
  marketing: {
    uploadCsv: false,
    deleteImport: false,
    generateAiStrategy: true,
    manageUsers: false,
    viewActivityLogs: false,
    modifySettings: false,
    viewReports: false,
    downloadPdf: false,
  },
  management: {
    uploadCsv: false,
    deleteImport: false,
    generateAiStrategy: false,
    manageUsers: false,
    viewActivityLogs: false,
    modifySettings: false,
    viewReports: true,
    downloadPdf: true,
  },
  it_support: {
    uploadCsv: true,
    deleteImport: true,
    generateAiStrategy: false,
    manageUsers: false,
    viewActivityLogs: true,
    modifySettings: false,
    viewReports: false,
    downloadPdf: false,
  },
};

/**
 * Normalize user role from various sources
 */
export const normalizeRole = (role?: string | null): UserRole | null => {
  const value = role?.toLowerCase().trim();

  if (value === USER_ROLES.ADMIN) return USER_ROLES.ADMIN;
  if (value === USER_ROLES.MARKETING) return USER_ROLES.MARKETING;
  if (value === USER_ROLES.MANAGEMENT) return USER_ROLES.MANAGEMENT;
  if (
    value === "it" ||
    value === USER_ROLES.IT_SUPPORT ||
    value === "it support" ||
    value === "it-support"
  ) {
    return USER_ROLES.IT_SUPPORT;
  }

  return null;
};

/**
 * Get user role from localStorage
 */
export const getStoredRole = (): UserRole | null => {
  if (typeof window === "undefined") return null;

  // Try direct role keys
  const directRoleKeys = ["maiinRole", "role", "userRole", "maiinsight_role"];
  for (const key of directRoleKeys) {
    const role = localStorage.getItem(key);
    if (role) {
      const normalized = normalizeRole(role);
      if (normalized) return normalized;
    }
  }

  // Try user object keys
  const userStorageKeys = [
    "maiinUser",
    "user",
    "authUser",
    "currentUser",
    "maiinsight_user",
  ];
  for (const key of userStorageKeys) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) continue;

    try {
      const parsed = JSON.parse(rawValue);
      const role = parsed?.role || parsed?.user?.role;
      if (role) {
        const normalized = normalizeRole(role);
        if (normalized) return normalized;
      }
    } catch {
      continue;
    }
  }

  return null;
};

/**
 * Get stored token from localStorage
 */
export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;

  const tokenKeys = [
    "maiinToken",
    "token",
    "authToken",
    "accessToken",
    "maiinsight_token",
  ];

  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return null;
};

/**
 * Get auth headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

/**
 * Check if user has access to a page
 */
export const canAccessPage = (userRole: UserRole | null, page: string): boolean => {
  if (!userRole) return false;
  return PAGE_PERMISSIONS[userRole]?.includes(page) ?? false;
};

/**
 * Check if user has access to a feature
 */
export const canAccessFeature = (
  userRole: UserRole | null,
  feature: string
): boolean => {
  if (!userRole) return false;
  return FEATURE_PERMISSIONS[userRole]?.[feature] ?? false;
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    admin: "Administrator",
    marketing: "Marketing",
    management: "Management",
    it_support: "IT Support",
  };
  return displayNames[role] || role;
};
