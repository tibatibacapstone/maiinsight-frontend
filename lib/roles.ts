/**
 * Role Management System
 * Centralized role definitions and access control
 */

export const USER_ROLES = {
  OPERATIONAL: "operational",
  MANAGEMENT: "management",
  IT_SUPPORT: "it_support",
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  operational: [
    "dashboard",
    "segments",
    "data",
    "targeting",
    "genai",
    "instasight",
    "reports",
    "history",
    "settings",
  ],
  management: [
    "dashboard",
    "reports",
    "segments",
    "genai",
    "instasight",
  ],
  it_support: [
    "dashboard",
    "segments",
    "data",
    "targeting",
    "genai",
    "instasight",
    "history",
    "settings",
    "reports",
  ],
}

export const FEATURE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  operational: {
    uploadCsv: true,
    deleteImport: true,
    viewRawImports: true,
    viewImportJobs: true,
    downloadExports: true,
    generateAiStrategy: true,
    viewAiStrategy: true,
    modifyAiStrategy: true,
    approveAiStrategy: true,
    manageUsers: false,
    viewActivityLogs: true,
    viewSettings: true,
    modifySettings: false,
    viewReports: true,
    downloadPdf: true,
    downloadMarketingConfidential: true,
    technicalAccess: false,
    troubleshootingOnly: false,
    auditSensitiveActions: false,
    businessAuthority: true,
    readOnly: true,
  },
  management: {
    uploadCsv: false,
    deleteImport: false,
    viewRawImports: false,
    viewImportJobs: false,
    downloadExports: false,
    generateAiStrategy: false,
    viewAiStrategy: true,
    modifyAiStrategy: false,
    approveAiStrategy: false,
    manageUsers: false,
    viewActivityLogs: false,
    viewSettings: false,
    modifySettings: false,
    viewReports: true,
    downloadPdf: true,
    downloadMarketingConfidential: true,
    technicalAccess: false,
    troubleshootingOnly: false,
    auditSensitiveActions: false,
    businessAuthority: true,
    readOnly: true,
  },
  it_support: {
    uploadCsv: true,
    deleteImport: true,
    viewRawImports: true,
    viewImportJobs: true,
    downloadExports: true,
    generateAiStrategy: true,
    viewAiStrategy: true,
    modifyAiStrategy: true,
    approveAiStrategy: false,
    manageUsers: true,
    viewActivityLogs: true,
    viewSettings: true,
    modifySettings: true,
    viewReports: true,
    downloadPdf: true,
    downloadMarketingConfidential: true,
    technicalAccess: true,
    troubleshootingOnly: true,
    auditSensitiveActions: true,
    businessAuthority: false,
    readOnly: false,
  },
}

export const SENSITIVE_AUDIT_FEATURES = new Set([
  "uploadCsv",
  "deleteImport",
  "viewRawImports",
  "downloadExports",
  "generateAiStrategy",
  "modifyAiStrategy",
  "modifySettings",
  "manageUsers",
])

export const requiresAudit = (
  userRole: UserRole | null,
  feature: string
): boolean => {
  return userRole === USER_ROLES.IT_SUPPORT && SENSITIVE_AUDIT_FEATURES.has(feature)
}

export const hasBusinessAuthority = (userRole: UserRole | null): boolean => {
  if (!userRole) return false
  return FEATURE_PERMISSIONS[userRole]?.businessAuthority ?? false
}

export const normalizeRole = (role?: string | null): UserRole | null => {
  const value = role?.toLowerCase().trim()

  if (value === USER_ROLES.OPERATIONAL) return USER_ROLES.OPERATIONAL
  if (value === USER_ROLES.MANAGEMENT) return USER_ROLES.MANAGEMENT
  if (
    value === "it" ||
    value === USER_ROLES.IT_SUPPORT ||
    value === "it support" ||
    value === "it-support"
  ) {
    return USER_ROLES.IT_SUPPORT
  }

  return null
}

export const getStoredRole = (): UserRole | null => {
  if (typeof window === "undefined") return null

  const directRoleKeys = ["maiinRole", "role", "userRole", "maiinsight_role"]
  for (const key of directRoleKeys) {
    const role = localStorage.getItem(key)
    if (role) {
      const normalized = normalizeRole(role)
      if (normalized) return normalized
    }
  }

  const userStorageKeys = ["maiinUser", "user", "authUser", "currentUser", "maiinsight_user"]
  for (const key of userStorageKeys) {
    const rawValue = localStorage.getItem(key)
    if (!rawValue) continue

    try {
      const parsed = JSON.parse(rawValue)
      const role = parsed?.role || parsed?.user?.role
      if (role) {
        const normalized = normalizeRole(role)
        if (normalized) return normalized
      }
    } catch {
      continue
    }
  }

  return null
}

export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null

  const tokenKeys = ["maiinToken", "token", "authToken", "accessToken", "maiinsight_token"]

  for (const key of tokenKeys) {
    const token = localStorage.getItem(key)
    if (token) return token
  }

  return null
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export const canAccessPage = (userRole: UserRole | null, page: string): boolean => {
  if (!userRole) return false
  return PAGE_PERMISSIONS[userRole]?.includes(page) ?? false
}

export const canAccessFeature = (userRole: UserRole | null, feature: string): boolean => {
  if (!userRole) return false
  return FEATURE_PERMISSIONS[userRole]?.[feature] ?? false
}

export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    operational: "Marketing Operational",
    management: "Management",
    it_support: "IT Support",
  }
  return displayNames[role] || role
}
