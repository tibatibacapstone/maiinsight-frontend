"use client"

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AccessDenied } from "@/components/access-denied"
import { BusinessErrorAlert } from "@/components/business-error-alert"
import { toast } from "sonner"
import {
  getStoredRole,
  getStoredToken,
  getAuthHeaders,
  canAccessFeature,
  USER_ROLES,
} from "@/lib/roles"
import {
  getSourceSyncLabel,
  isSourceSyncDisabled,
} from "@/lib/data-source-sync-state.mjs"
import { getApiUrl } from "@/lib/api"
import {
  formatDatabaseLastSyncDateTime,
  formatLatestTransactionDate,
} from "@/lib/transaction-date"
import { notifySegmentationUpdated, runCustomerSegmentation } from "@/lib/segmentation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Database,
  Upload,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  Loader2,
  Info,
  Trash2,
  Download,
  Eye,
  type LucideIcon,
} from "lucide-react"

type SyncStatus = "queued" | "processing" | "completed" | "failed"

interface SyncJob {
  id: string
  sourceRecordId?: number | string
  name: string
  type: "api" | "file"
  status: SyncStatus
  progress: number
  records: number
  startedAt: string
  completedAt?: string
  error?: string
  businessError?: BusinessErrorState | null
  performedByName?: string
}

interface ImportJobImpact {
  facilityTransactionCount: number
  courtHourUsageCount: number
  rawTransactionCount: number
  orphanCustomerCount: number
  retainedCustomerCount: number
}

interface DataSource {
  id: string
  name: string
  type: "api" | "database" | "file"
  status: "connected" | "disconnected" | "syncing" | "error"
  lastSync: string
  records: number
  latestTransaction?: string
  tokenStatus?: "valid" | "expired" | "error" | "unknown"
}

interface ValidationRowError {
  rowNumber: number
  column: string
  value: unknown
  message: string
}

interface FriendlyErrorResponse {
  errorCode?: string
  message?: string
  suggestion?: string
  technicalMessage?: string
  validationErrors?: ValidationRowError[]
}

interface UploadImportResponse {
  success: boolean
  errorCode?: string
  message: string
  suggestion?: string
  technicalMessage?: string
  batchId?: number
  data?: {
    batchId: number
    fileName: string
    rowCount: number
    headers: string[]
    status: string
  }
}

interface ImportAnomalyItem {
  rowNumber: number
  type: "payment_completed_without_order_id" | "manual_walk_in_with_order_id"
  customerName: string | null
  orderId: string | null
}

interface ImportAnomalySummary {
  paymentCompletedWithoutOrderId: number
  manualWalkInWithOrderId: number
}

interface ImportAnomalyRequest {
  anomalySummary: ImportAnomalySummary
  anomalies: ImportAnomalyItem[]
}

interface ImportJobResponse {
  id: string
  sourceRecordId: number | string
  name: string
  type: "api" | "file"
  records: number
  status: string
  startedAt: string
  completedAt?: string | null
  error?: string | null
  performedBy?: {
    id: number
    name?: string | null
    email: string
  } | null
}

interface ImportJobsResponse {
  success: boolean
  message: string
  data: ImportJobResponse[]
}

interface DeleteImportJobResponse {
  success: boolean
  message: string
}

interface RawTransactionRow {
  id: number
  batchId: number
  rowNumber: number
  data: Record<string, unknown>
  status: string
  errorMessage?: string | null
  createdAt: string
}

interface RawRowsResponse {
  success: boolean
  message?: string
  data?: {
    batch?: {
      id: number
      fileName: string
      rowCount: number
    }
    columns?: string[]
    rows?: RawTransactionRow[]
  }
}

interface BusinessErrorState {
  title: string
  message: string
  suggestion?: string | null
  errorCode?: string | null
  technicalDetails?: string | null
  validationErrors?: ValidationRowError[]
}
interface DataCenterResponse {
  dataCenter: {
    sources: DataSource[]
    recentActivities: unknown[]
    totalNotifications: number
  }
}

interface MetaSyncResponse {
  success?: boolean
  message?: string
  data?: {
    configured: boolean
    connectionState: "not_configured" | "ready" | "connected" | "syncing" | "error"
    tokenStatus?: "valid" | "expired" | "error" | "unknown"
    latestSync: {
      status: string
      message?: string | null
      startedAt?: string | null
      finishedAt?: string | null
    } | null
    setupMessage: string | null
    suggestion: string | null
  }
}

interface MlSummary {
  lastRun: string
  records: number
  totalCustomers: number
} 

interface TemplatePreviewData {
  headers: string[]
  rows: string[][]
}

const defaultDataSources: DataSource[] = [
  {
    id: "1",
    name: "MaiinSight Database",
    type: "database",
    status: "disconnected",
    lastSync: "Not synced yet",
    records: 0,
    latestTransaction: "No data",
  },
  {
    id: "2",
    name: "Instagram Data Engine",
    type: "api",
    status: "disconnected",
    lastSync: "Not synced yet",
    records: 0,
  },
  {
    id: "3",
    name: "AI Strategy Engine",
    type: "api",
    status: "disconnected",
    lastSync: "Not synced yet",
    records: 0,
  },
]

const initialSyncJobs: SyncJob[] = []

const statusConfig: Record<
  SyncStatus,
  {
    color: string
    bg: string
    icon: LucideIcon
    label: string
  }
> = {
  queued: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    icon: Clock,
    label: "Queued",
  },
  processing: {
    color: "text-chart-2",
    bg: "bg-chart-2/10",
    icon: Loader2,
    label: "Processing",
  },
  completed: {
    color: "text-primary",
    bg: "bg-primary/10",
    icon: CheckCircle2,
    label: "Completed",
  },
  failed: {
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: AlertCircle,
    label: "Failed",
  },
}

const SUPPORTED_IMPORT_EXTENSIONS = [".csv", ".xlsx", ".xls"]

const getFileExtension = (fileName: string) => {
  const lowerName = fileName.toLowerCase()
  return (
    SUPPORTED_IMPORT_EXTENSIONS.find((extension) => lowerName.endsWith(extension)) || null
  )
}

const isSupportedImportFile = (file: File) => {
  return getFileExtension(file.name) !== null
}

const createUnsupportedFileError = (): BusinessErrorState => ({
  title: "Unsupported File Type",
  message: "MaiinSight only supports CSV and Excel transaction files.",
  suggestion: "Please upload a .csv, .xlsx, or .xls file.",
  errorCode: "UNSUPPORTED_FILE_TYPE",
})

const createFriendlyImportError = (
  response: FriendlyErrorResponse | null,
  fallbackTitle = "Import Failed"
): BusinessErrorState => ({
  title: fallbackTitle,
  message: response?.message || "We couldn't process the uploaded file.",
  suggestion:
    response?.suggestion ||
    "Please make sure the file follows the required MaiinSight transaction template, then try again.",
  errorCode: response?.errorCode || "IMPORT_FAILED",
  technicalDetails: response?.technicalMessage || null,
  validationErrors: Array.isArray(response?.validationErrors)
    ? response.validationErrors
    : [],
})

const createBusinessErrorState = ({
  title,
  message,
  suggestion,
  errorCode,
  technicalDetails,
}: BusinessErrorState): BusinessErrorState => ({
  title,
  message,
  suggestion,
  errorCode,
  technicalDetails,
})
const getCurrentTime = () => new Date().toISOString()

const getCurrentSyncTimestamp = () => new Date().toISOString()

const formatDisplaySyncTime = (value?: string | null) => {
  if (!value) return "Not synced yet"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const formatTransactionDate = (value?: string | null) => {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date)
}

const getDisplayNow = () => formatDisplaySyncTime(new Date().toISOString())

const getMetaSyncTimestamp = (metaStatusResult: MetaSyncResponse | null) => {
  const latestSync = metaStatusResult?.data?.latestSync
  return latestSync?.finishedAt || latestSync?.startedAt || null
}

const getMetaSourceStatus = (metaStatusResult: MetaSyncResponse | null): DataSource["status"] => {
  if (!metaStatusResult?.success || !metaStatusResult.data) {
    return "disconnected"
  }

  if (!metaStatusResult.data.configured) {
    return "disconnected"
  }

  if (metaStatusResult.data.connectionState === "error") {
    return "error"
  }

  if (metaStatusResult.data.connectionState === "syncing") {
    return "syncing"
  }

  return "connected"
}

const publishLastSyncTime = () => {
  if (typeof window === "undefined") return

  const timestamp = getCurrentSyncTimestamp()
  localStorage.setItem("maiinLastDataSyncAt", timestamp)
  window.dispatchEvent(
    new CustomEvent("maiin-data-sync-updated", {
      detail: { timestamp },
    }),
  )
}

const formatBackendTime = (dateValue?: string) => {
  if (!dateValue) return "-"

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return "-"

  const today = new Date()

  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const normalizeSyncStatus = (status: string): SyncStatus => {
  const normalizedStatus = status.toLowerCase()

  if (
    normalizedStatus === "uploaded" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "success"
  ) {
    return "completed"
  }

  if (normalizedStatus === "processing") {
    return "processing"
  }

  if (normalizedStatus === "failed" || normalizedStatus === "error") {
    return "failed"
  }

  return "queued"
}

const mapImportJobToSyncJob = (job: ImportJobResponse): SyncJob => {
  const status = normalizeSyncStatus(job.status)

  return {
    id: job.id,
    sourceRecordId: job.sourceRecordId,
    name: job.name,
    type: job.type,
    status,
    progress: status === "completed" ? 100 : status === "processing" ? 60 : 0,
    records: job.records || 0,
    startedAt: formatBackendTime(job.startedAt),
    completedAt:
      job.completedAt
        ? formatBackendTime(job.completedAt)
        : undefined,
    error: job.error || undefined,
    performedByName: job.performedBy?.name?.trim() || job.performedBy?.email || "Unknown user",
  }
}

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

const createSyncJob = (source: DataSource, status: SyncStatus, progress: number): SyncJob => ({
  id: `sync-${source.id}-${Date.now()}`,
  name: `${source.name} Sync`,
  type: "api",
  status,
  progress,
  records: 0,
  startedAt: getCurrentTime(),
})

export function DataManagement() {
  const [isRunningMl, setIsRunningMl] = useState(false)
const [mlMessage, setMlMessage] = useState("")
const [mlError, setMlError] = useState<BusinessErrorState | null>(null)
const [mlSummary, setMlSummary] = useState<MlSummary>({
  lastRun: "Not run yet",
  records: 0,
  totalCustomers: 0,
})
  const [dataSources, setDataSources] = useState<DataSource[]>(defaultDataSources)
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>(initialSyncJobs)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState<BusinessErrorState | null>(null)
  const [confirmImportRequest, setConfirmImportRequest] =
    useState<ImportAnomalyRequest | null>(null)

  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [removingJobId, setRemovingJobId] = useState<string | null>(null)

  const [rawModalOpen, setRawModalOpen] = useState(false)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)
  const [selectedRawJob, setSelectedRawJob] = useState<SyncJob | null>(null)
  const [rawRows, setRawRows] = useState<RawTransactionRow[]>([])
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [templatePreviewData, setTemplatePreviewData] = useState<TemplatePreviewData | null>(null)
  const [isLoadingRawRows, setIsLoadingRawRows] = useState(false)
  const [rawRowsError, setRawRowsError] = useState<BusinessErrorState | null>(null)
  const [viewedFailureDetails, setViewedFailureDetails] = useState<BusinessErrorState | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null)
  const [metaConfigured, setMetaConfigured] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)
  const [pendingJob, setPendingJob] = useState<SyncJob | null>(null)
  const [impactSummary, setImpactSummary] = useState<ImportJobImpact | null>(null)
  const [isLoadingImpact, setIsLoadingImpact] = useState(false)

  const userRole = getStoredRole()
  const canAccessDataCenter =
    userRole === USER_ROLES.OPERATIONAL|| userRole === USER_ROLES.IT_SUPPORT
  const canManageCsv = canAccessFeature(userRole, "uploadCsv")
  const canDeleteImport = canAccessFeature(userRole, "deleteImport")
  const canRunMachineLearning =
    userRole === USER_ROLES.OPERATIONAL || userRole === USER_ROLES.IT_SUPPORT
  const canViewTechnicalDetails = userRole === USER_ROLES.IT_SUPPORT

 const fetchDataCenter = useCallback(async () => {
  try {
    const token = getStoredToken()

    if (!token) {
      setDataSources(defaultDataSources)
      setMetaConfigured(false)
      return
    }

    const [summaryResponse, metaStatusResponse] = await Promise.all([
      fetch(getApiUrl("/dashboard/data-center"), {
        method: "GET",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
        },
      }),
      fetch(getApiUrl("/meta/status"), {
        method: "GET",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
        },
      }),
    ])

    const summaryResult = await summaryResponse.json().catch(() => null)
    const metaStatusResult = await metaStatusResponse.json().catch(() => null)

    if (!summaryResponse.ok || !summaryResult?.success || !summaryResult?.data) {
      console.warn("Invalid data center summary response:", {
        status: summaryResponse.status,
        result: summaryResult,
      })

      setDataSources(defaultDataSources)
      setMetaConfigured(false)
      return
    }

    const latestBatch = summaryResult.data.latestBatch
    const latestBatchTime = latestBatch?.updatedAt || latestBatch?.createdAt || null
    const metaConfigured = Boolean(metaStatusResult?.success && metaStatusResult?.data?.configured)
    setMetaConfigured(metaConfigured)
    const latestMetaSync = getMetaSyncTimestamp(metaStatusResult)
    const metaSourceStatus = getMetaSourceStatus(metaStatusResult)

    setDataSources([
      {
        id: "1",
        name: "MaiinSight Database",
        type: "database",
        status: summaryResult.data.totalFacilityTransactions > 0 ? "connected" : "disconnected",
        lastSync: formatDatabaseLastSyncDateTime(latestBatchTime),
        records: Number(summaryResult.data.totalFacilityTransactions || 0),
        latestTransaction: formatLatestTransactionDate(summaryResult.data.latestTransactionDate),
      },
      {
        id: "2",
        name: "Instagram Data Engine",
        type: "api",
        status: metaSourceStatus,
        lastSync: metaConfigured ? formatDisplaySyncTime(latestMetaSync) : "Not connected",
        records: Number(summaryResult.data.metaMediaCount || 0),
        tokenStatus: metaStatusResult?.data?.tokenStatus,
      },
      {
        id: "3",
        name: "AI Strategy Engine",
        type: "api",
        status: "connected",
        lastSync: latestBatchTime ? formatDisplaySyncTime(latestBatchTime) : "Ready when data is available",
        records: Number(summaryResult.data.aiStrategySuggestionCount || 0),
      },
    ])
  } catch (error) {
    console.warn("Failed to fetch data center summary:", error)
    setDataSources(defaultDataSources)
    setMetaConfigured(false)
  }
}, [])

  const fetchSyncJobs = useCallback(async () => {
  const userRole = getStoredRole()
  const token = getStoredToken()

  if (!token) {
    console.warn("Token not found. Please login again.")
    setSyncJobs(initialSyncJobs)
    setIsLoadingJobs(false)
    return
  }

  const canAccess = userRole === USER_ROLES.OPERATIONAL || userRole === USER_ROLES.IT_SUPPORT
  if (!canAccess) {
    console.warn("User does not have access to Data Center.")
    setSyncJobs(initialSyncJobs)
    setIsLoadingJobs(false)
    return
  }

  try {
    setIsLoadingJobs(true)

    const response = await fetch(getApiUrl("/imports/jobs"), {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const result = await response.json().catch(() => null)

    if (response.status === 401 || response.status === 403) {
  console.warn("Token expired or invalid. Please login again.")
  localStorage.clear()
  setSyncJobs(initialSyncJobs)
  return
}

if (!response.ok) {
  console.warn("Failed to fetch import jobs:", {
    status: response.status,
    result,
  })
  setSyncJobs(initialSyncJobs)
  return
}

    if (!result?.success || !Array.isArray(result.data)) {
      throw new Error("Invalid response format from import jobs API.")
    }

    const mappedJobs = result.data.map(mapImportJobToSyncJob)

    setSyncJobs(mappedJobs.length > 0 ? mappedJobs : initialSyncJobs)
    publishLastSyncTime()
  } catch (error) {
    console.warn("Failed to fetch sync jobs:", error)
    setSyncJobs(initialSyncJobs)
  } finally {
    setIsLoadingJobs(false)
  }
}, [])

  const syncSource = useCallback(
    async (sourceId: string) => {
      const source = dataSources.find((item) => item.id === sourceId)

      if (!source) return

      const token = getStoredToken()
      if (!token) {
        toast.error("Sync unavailable", {
          description: "Please sign in again to continue syncing data.",
        })
        return
      }

      try {
        setSyncingSourceId(sourceId)

        const job = createSyncJob(source, "processing", 35)
        setSyncJobs((prev) => [job, ...prev])

        if (sourceId === "1") {
          const response = await fetch(getApiUrl("/imports/manual-sync"), {
            method: "POST",
            headers: getAuthHeaders(),
          })

          if (!response.ok) {
            throw new Error("Failed to refresh MaiinSight Database.")
          }
        }

        if (sourceId === "2") {
          const response = await fetch(getApiUrl("/meta/sync"), {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          })

          const result: MetaSyncResponse = await response.json()

          if (!response.ok || result.success === false) {
            throw new Error(result.message || "Failed to sync Meta Graph API.")
          }
        }

        if (sourceId === "3") {
          const response = await fetch(getApiUrl("/ai-strategy/status"), {
            method: "GET",
            cache: "no-store",
            headers: getAuthHeaders(),
          })

          if (!response.ok) {
            throw new Error("Failed to refresh AI Strategy Engine status.")
          }
        }

        await fetchDataCenter()
        await fetchSyncJobs()
        const syncedAt = getDisplayNow()
        setDataSources((prev) =>
          prev.map((item) =>
            item.id === sourceId
              ? {
                  ...item,
                  lastSync: syncedAt,
                }
              : item,
          ),
        )
        publishLastSyncTime()
        toast.success("Sync complete", {
          description: `${source.name} has been refreshed.`,
        })

        setSyncJobs((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  status: "completed",
                  progress: 100,
                  records:
                    sourceId === "1"
                      ? item.records
                      : sourceId === "2"
                        ? item.records
                        : item.records,
                  completedAt: getCurrentTime(),
                }
              : item,
          ),
        )
      } catch (error) {
        setSyncJobs((prev) =>
          prev.map((item) =>
            item.id.startsWith(`sync-${sourceId}-`)
              ? {
                  ...item,
                  status: "failed",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Sync failed.",
                }
              : item,
          ),
        )
        toast.error("Sync failed", {
          description:
            error instanceof Error ? error.message : `Failed to sync ${source.name}.`,
        })
      } finally {
        setSyncingSourceId(null)
      }
    },
    [dataSources, fetchDataCenter, fetchSyncJobs],
  )
  const fetchMlSummary = useCallback(async () => {
  try {
    const token = getStoredToken()

    if (!token) {
      setMlSummary({
        lastRun: "Not run yet",
        records: 0,
        totalCustomers: 0,
      })
      return
    }

    const response = await fetch(getApiUrl("/system/summary"), {
      method: "GET",
      cache: "no-store",
      headers: {
        ...getAuthHeaders(),
      },
    })

    const result = await response
      .json()
      .catch(() => null)

    if (!response.ok || !result?.success || !result.data) {
      setMlSummary({
        lastRun: "Not run yet",
        records: 0,
        totalCustomers: 0,
      })
      return
    }

    const latestSegmentationRun = result.data.latestSegmentationRun

    setMlSummary({
      lastRun: latestSegmentationRun?.runDate ? formatDisplaySyncTime(latestSegmentationRun.runDate) : "Not run yet",
      records: result.data.eligibleCustomerCount || 0,
      totalCustomers: latestSegmentationRun?.totalCustomers || 0,
    })
  } catch (error) {
    console.warn("Failed to fetch segmentation summary:", error)

    setMlSummary({
      lastRun: "Not run yet",
      records: 0,
      totalCustomers: 0,
    })
  }
}, [])


  useEffect(() => {
    fetchSyncJobs()
  }, [fetchSyncJobs])

  useEffect(() => {
    fetchDataCenter()
  }, [fetchDataCenter])

  useEffect(() => {
    fetchMlSummary()
  }, [fetchMlSummary])

  useEffect(() => {
    if (!templatePreviewOpen) {
      return
    }

    const controller = new AbortController()

    const loadTemplatePreview = async () => {
      try {
        const response = await fetch("/tmp-upload-sample.csv", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load template preview.")
        }

        const csvText = await response.text()
        const lines = csvText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)

        if (lines.length === 0) {
          setTemplatePreviewData(null)
          return
        }

        const [headerLine, ...dataLines] = lines
        setTemplatePreviewData({
          headers: parseCsvLine(headerLine),
          rows: dataLines.map(parseCsvLine),
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setTemplatePreviewData(null)
      }
    }

    void loadTemplatePreview()

    return () => controller.abort()
  }, [templatePreviewOpen])

    const resetUploadState = () => {
    setUploadFile(null)
    setUploadProgress(0)
    setUploadMessage("")
    setUploadError(null)
    setIsDragging(false)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (isUploading) return

    setUploadModalOpen(open)

    if (!open) {
      resetUploadState()
    }
  }

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    setUploadMessage("")
    setUploadError(null)

    const files = e.dataTransfer.files

    if (!files || files.length === 0) return

    const file = files[0]

    if (!isSupportedImportFile(file)) {
      setUploadError(createUnsupportedFileError())
      return
    }

    setUploadFile(file)
  }, [])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadMessage("")
    setUploadError(null)

    const files = e.target.files

    if (!files || files.length === 0) return

    const file = files[0]

    if (!isSupportedImportFile(file)) {
      setUploadError(createUnsupportedFileError())
      return
    }

    setUploadFile(file)
  }

  const uploadFileWithProgress = async (
    url: string,
    formData: FormData,
    headers: Record<string, string>,
  ): Promise<UploadImportResponse> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", url)

      Object.entries(headers).forEach(([key, value]) => {
        if (value && key.toLowerCase() !== "content-type") {
          xhr.setRequestHeader(key, value)
        }
      })

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(Math.min(Math.max(percent, 0), 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch (error) {
            reject(new Error("Invalid server response during upload."))
          }
          return
        }

        let parsed: UploadImportResponse | null = null
        try {
          parsed = JSON.parse(xhr.responseText)
        } catch {
          // ignore parse failure
        }

        const friendlyError = createFriendlyImportError(parsed, "Import Failed")
        const parsedWithConfirmation = parsed as UploadImportResponse & {
          requiresConfirmation?: boolean
          anomalySummary?: ImportAnomalySummary
          anomalies?: ImportAnomalyItem[]
        }
        if (parsedWithConfirmation?.requiresConfirmation) {
          const anomalyError = Object.assign(friendlyError, {
            importAnomaly: {
              anomalySummary: parsedWithConfirmation.anomalySummary || {
                paymentCompletedWithoutOrderId: 0,
                manualWalkInWithOrderId: 0,
              },
              anomalies: parsedWithConfirmation.anomalies || [],
            } as ImportAnomalyRequest,
          })
          reject(anomalyError)
          return
        }

        reject(friendlyError)
      }

      xhr.onerror = () => reject(new Error("Upload request failed."))
      xhr.onabort = () => reject(new Error("Upload aborted."))
      xhr.send(formData)
    })
  }

  const handleUploadImport = async (confirm = false) => {
    const userRole = getStoredRole()

    if (!canAccessFeature(userRole, "uploadCsv")) {
      const message = "Upload is available to Marketing Operational and IT Support only."
      setUploadError({
        title: "Access Denied",
        message,
        suggestion: "Please sign in with a Marketing Operational or IT Support account.",
        errorCode: "ACCESS_DENIED",
      })
      toast.error("Access denied", {
        description: message,
      })
      return
    }

    if (!uploadFile) {
      setUploadError({
        title: "No File Selected",
        message: "Please select a transaction file first.",
        suggestion: "Upload a CSV or Excel transaction file to continue.",
        errorCode: "FILE_REQUIRED",
      })
      return
    }

    const currentFile = uploadFile
    const jobId = `import-${Date.now()}`
    const startedAt = getCurrentTime()

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setUploadMessage("")
      setUploadError(null)

      const newJob: SyncJob = {
        id: jobId,
        name: currentFile.name,
        type: "file",
        status: "processing",
        progress: 0,
        records: 0,
        startedAt,
      }

      setSyncJobs((prev) => [newJob, ...prev])

      const formData = new FormData()
      formData.append("file", currentFile)
      if (confirm) {
        formData.append("confirmImport", "true")
      }

      const result = await uploadFileWithProgress(
        getApiUrl("/imports/upload-file"),
        formData,
        getAuthHeaders(),
      )

      if (!result?.success || !result.data) {
        const err = createFriendlyImportError(result, "Import Failed")
        if (result?.batchId) (err as unknown as Record<string, unknown>).batchId = result.batchId
        throw err
      }

      setUploadProgress(100)
      setUploadMessage(
        `Upload success. ${result.data.rowCount.toLocaleString()} rows imported from ${result.data.fileName}.`
      )
      toast.success("Upload complete", {
        description: `${result.data.fileName} has been imported.`,
      })

      await fetchSyncJobs()
      publishLastSyncTime()
      await fetchDataCenter()

      setTimeout(() => {
        setUploadModalOpen(false)
        resetUploadState()
      }, 1200)
    } catch (error) {
      const friendlyError =
        error && typeof error === "object" && "title" in error
          ? (error as BusinessErrorState)
          : createFriendlyImportError(null, "Import Failed")

      const importAnomaly =
        error &&
        typeof error === "object" &&
        "importAnomaly" in error &&
        error.importAnomaly
          ? (error as unknown as { importAnomaly: ImportAnomalyRequest }).importAnomaly
          : null

      if (importAnomaly) {
        setConfirmImportRequest(importAnomaly)
        return
      }

      setUploadError(friendlyError)
      toast.error(friendlyError.title, {
        description: friendlyError.message,
      })

      const failedBatchId = (error && typeof error === "object" && "batchId" in error)
        ? String((error as Record<string, unknown>).batchId)
        : undefined

      setSyncJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                id: failedBatchId || job.id,
                status: "failed",
                progress: 0,
                error: friendlyError.message,
              }
            : job
        )
      )

      // Replace the optimistic card with the persisted job and its original actor.
      await fetchSyncJobs()
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmImport = async (approved: boolean) => {
    const request = confirmImportRequest
    setConfirmImportRequest(null)

    if (!approved) {
      const message =
        "The import was cancelled because rows in the file have a booking channel and Order ID that do not match."
      setUploadError({
        title: "Import Cancelled",
        message,
        suggestion: "Correct the affected rows in the file, then upload it again.",
        errorCode: "IMPORT_ORDER_ID_ANOMALY",
      })
      toast.error("Import cancelled", {
        description: message,
      })
      await fetchSyncJobs()
      return
    }

    await handleUploadImport(true)
  }

  const handleRunMachineLearning = async () => {
    if (!canRunMachineLearning) {
      const businessError = createBusinessErrorState({
        title: "Access Denied",
        message: "Customer segmentation is available to Marketing Operational and IT Support only.",
        suggestion: "Please sign in with a Marketing Operational or IT Support account.",
        errorCode: "ACCESS_DENIED",
      })

      setMlError(businessError)
      toast.error(businessError.title, {
        description: businessError.message,
      })
      return
    }

    try {
      setIsRunningMl(true)
      setMlMessage("")
      setMlError(null)

      const segmentationResult = await runCustomerSegmentation()

      await fetchMlSummary()
      await fetchDataCenter()
      await fetchSyncJobs()

      publishLastSyncTime()
      notifySegmentationUpdated()

      setMlMessage(
        `Customer segmentation completed. Customer Value Segmentation processed ${segmentationResult.run?.totalCustomers.toLocaleString() || 0} customers with Business Segmentation K: ${segmentationResult.selectedK ?? 4}.`
      )

      toast.success("Customer segmentation completed", {
        description: `Customer Value Segmentation is ready with Business Segmentation K: ${segmentationResult.selectedK ?? 4}.`,
      })
    } catch (error) {
      const businessError = createBusinessErrorState({
        title: "Customer Segmentation Failed",
        message: "We couldn't complete the segmentation run.",
        suggestion: "Please try again after the latest data import is complete.",
        errorCode: "SEGMENTATION_RUN_FAILED",
        technicalDetails: error instanceof Error ? error.message : "Failed to run segmentation.",
      })

      setMlError(businessError)

      toast.error(businessError.title, {
        description: businessError.message,
      })
    } finally {
      setIsRunningMl(false)
    }
  }

const handleViewRawRows= async (job: SyncJob) => {
  try {
    setSelectedRawJob(job)
    setRawModalOpen(true)
    setIsLoadingRawRows(true)
    setRawRowsError(null)
    setRawRows([])
    setRawHeaders([])
    setViewedFailureDetails(null)

    const response = await fetch(getApiUrl(`/imports/batches/${job.sourceRecordId}/rows`), {
      method: "GET",
      cache: "no-store",
      headers: getAuthHeaders(),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.success) {
      throw createFriendlyImportError(result, "Transaction Data Preview Failed")
    }

    if (job.status === "failed") {
      setViewedFailureDetails(
        createFriendlyImportError(
          {
            message: result.data?.errorMessage,
            suggestion: result.data?.suggestion,
            errorCode: result.data?.errorCode,
            validationErrors: result.data?.validationErrors,
          },
          "Import Failed"
        )
      )
      return
    }

    const rows: RawTransactionRow[] = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.rows)
        ? result.data.rows
        : []

    setRawRows(rows)

    const columns = Array.isArray(result.data?.columns) ? result.data.columns : []
    setRawHeaders(
      columns.length
        ? columns
        : Array.from(new Set(rows.flatMap((row) => Object.keys(row.data || {})))),
    )
  } catch (error) {
    const friendlyError =
      error && typeof error === "object" && "title" in error
        ? (error as BusinessErrorState)
        : createBusinessErrorState({
            title: "Transaction Data Preview Failed",
            message: "We couldn't load the cleaned transaction preview.",
            suggestion: "Please try again.",
            errorCode: "TRANSACTION_DATA_PREVIEW_FAILED",
            technicalDetails:
              error instanceof Error ? error.message : "Failed to load transaction data.",
          })

    setRawRowsError(friendlyError)
  } finally {
    setIsLoadingRawRows(false)
  }
}
  const handleRemoveJob = async (job: SyncJob) => {
  if (job.type !== "file") {
    toast.error("Delete unavailable", {
      description: "Only imported transaction files can be deleted.",
    })
    return
  }

  const userRole = getStoredRole()
  if (!canAccessFeature(userRole, "deleteImport")) {
    toast.error("Access denied", {
      description: "Delete is available to Marketing and IT Support only.",
    })
    return
  }

  try {
    setRemovingJobId(job.id)

    const response = await fetch(getApiUrl(`/imports/jobs/${job.sourceRecordId}`), {
  method: "DELETE",
  headers: getAuthHeaders(),
})

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to delete import history.")
    }

      setSyncJobs((prev) => prev.filter((item) => item.id !== job.id))
      toast.success("Import deleted", {
        description: `"${job.name}" and its uploaded rows have been removed.`,
      })
    } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete import history."
    toast.error("Delete failed", {
      description: message,
    })
    } finally {
      setRemovingJobId(null)
      }
  }

  const loadJobImpact = async (job: SyncJob) => {
  if (job.type !== "file" || job.sourceRecordId === undefined) return

  setIsLoadingImpact(true)
  try {
    const response = await fetch(getApiUrl(`/imports/jobs/${job.sourceRecordId}/impact`), {
      method: "GET",
      headers: getAuthHeaders(),
    })
    const result = await response.json()

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to load deletion impact.")
    }

    const impact = result.data
    if (impact) {
      setImpactSummary({
        facilityTransactionCount: Number(impact.facilityTransactionCount ?? 0),
        courtHourUsageCount: Number(impact.courtHourUsageCount ?? 0),
        rawTransactionCount: Number(impact.rawTransactionCount ?? 0),
        orphanCustomerCount: Number(impact.orphanCustomerCount ?? 0),
        retainedCustomerCount: Number(impact.retainedCustomerCount ?? 0),
      })
    }
  } catch {
    setImpactSummary(null)
  } finally {
    setIsLoadingImpact(false)
  }
  }

  const handleConfirmDelete = async () => {
    if (!pendingJob) return

    const job = pendingJob
    setDeleteConfirmOpen(false)
    setPendingJob(null)
    setImpactSummary(null)
    await handleRemoveJob(job)
  }

  const handleDownloadReport = async (job: SyncJob) => {
    if (job.type !== "file") {
      toast.error("Download unavailable", {
        description: "Only imported transaction files can be exported from this view.",
      })
      return
    }

    const toastId = toast.loading(`Preparing export for "${job.name}"...`)

    try {
      const response = await fetch(getApiUrl(`/imports/batches/${job.sourceRecordId}/export`), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.message || "Failed to prepare download.")
      }

      const exportBlob = await response.blob()
      const url = URL.createObjectURL(exportBlob)
      const link = document.createElement("a")
      link.href = url
      const disposition = response.headers.get("Content-Disposition") || ""
      const fileNameMatch = disposition.match(/filename="([^"]+)"/i)
      link.download =
        fileNameMatch?.[1] ||
        `${job.name.replace(/\.(?:csv|xlsx|xls)$/i, "")}_transformed.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.dismiss(toastId)
      toast("Please wait while the file is downloading.", {
        description: `${job.name} is being prepared in the background.`,
        duration: 4000,
      })
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      toast.success(`Transformed export ready`, {
        description: `${link.download} has been downloaded.`,
        duration: 8000,
      })
    } catch (error) {
      toast.dismiss(toastId)
      toast.error("Download failed", {
        description:
          error instanceof Error ? error.message : "Unable to prepare the download.",
        duration: 5000,
      })
    } finally {
      setDownloadConfirmOpen(false)
      setPendingJob(null)
    }
  }
  const triggerSync = (sourceId: string) => {
    void syncSource(sourceId)
  }
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }
  const sortedRows = [...rawRows].sort((a, b) => {
    if (!sortColumn) return 0
    const va = a.data?.[sortColumn]
    const vb = b.data?.[sortColumn]
    const sa = va == null ? "" : String(va)
    const sb = vb == null ? "" : String(vb)
    return sortDirection === "asc" ? sa.localeCompare(sb, undefined, { numeric: true }) : sb.localeCompare(sa, undefined, { numeric: true })
  })
if (!canAccessDataCenter) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access Data Center.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
    return (
      
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Data Management Center</h1>
            <p className="text-muted-foreground">
              Sync data and upload your transaction files
            </p>
          </div>
          <Dialog open={uploadModalOpen} onOpenChange={handleDialogOpenChange} >
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!canManageCsv}>
                <Upload className="h-4 w-4" />
                Upload Data File
              </Button>
            </DialogTrigger>

            <DialogContent className="!w-[min(96vw,48rem)] !max-w-none p-0">
              <div className="border-b px-6 py-5">
                <DialogHeader className="text-left">
                  <DialogTitle>Upload Data File</DialogTitle>
                  <DialogDescription>
                    Upload a CSV or Excel transaction file to import data into MaiinSight.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="max-h-[calc(85vh-5rem)] space-y-4 overflow-y-auto px-6 py-5">
                <div
                  className={`flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:px-8 ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : uploadFile
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {uploadFile ? (
                    <div className="flex max-w-full flex-col items-center gap-2">
                      <FileSpreadsheet className="h-10 w-10 text-primary" />
                      <p className="max-w-full break-all font-medium">
                        {uploadFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadFile.size / 1024).toFixed(1)} KB
                      </p>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFile(null)
                          setUploadMessage("")
                          setUploadError(null)
                        }}
                        className="text-destructive"
                        disabled={isUploading}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop your transaction file here, or
                      </p>

                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">
                          browse to select
                        </span>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </Label>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">Supported formats: CSV, XLSX, XLS</p>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {uploadProgress < 100 ? "Uploading..." : "Finalizing import..."}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {uploadMessage && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                    {uploadMessage}
                  </div>
                )}

                {uploadError && (
                  <div className="space-y-3">
                    <BusinessErrorAlert
                      title={uploadError.title}
                      message={uploadError.message}
                      suggestion={uploadError.suggestion}
                      errorCode={uploadError.errorCode}
                      technicalDetails={uploadError.technicalDetails}
                      showTechnicalDetails={canViewTechnicalDetails}
                    />

                    {uploadError.validationErrors && uploadError.validationErrors.length > 0 && (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-destructive">
                            Invalid rows found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Please fix these rows in your CSV or Excel file, then upload again.
                          </p>
                        </div>

                        <div className="max-h-64 overflow-auto rounded-lg border bg-background">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-background">
                              <tr className="border-b">
                                <th className="px-3 py-2 text-left font-semibold">Row</th>
                                <th className="px-3 py-2 text-left font-semibold">Column</th>
                                <th className="px-3 py-2 text-left font-semibold">Value</th>
                                <th className="px-3 py-2 text-left font-semibold">Reason</th>
                              </tr>
                            </thead>

                            <tbody>
                              {uploadError.validationErrors.map((item, index) => (
                                <tr
                                  key={`${item.rowNumber}-${item.column}-${index}`}
                                  className="border-b last:border-b-0"
                                >
                                  <td className="px-3 py-2 align-top font-medium">
                                    {item.rowNumber}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    {item.column}
                                  </td>
                                  <td className="max-w-[180px] break-words px-3 py-2 align-top text-muted-foreground">
                                    {item.value === null ||
                                    item.value === undefined ||
                                    item.value === ""
                                      ? "-"
                                      : String(item.value)}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    {item.message}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  className="w-full shrink-0"
                  disabled={!canManageCsv || !uploadFile || isUploading}
                  onClick={() => handleUploadImport()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress < 100 ? "Uploading..." : "Finalizing..."}
                    </>
                  ) : (
                    "Start Import"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={confirmImportRequest !== null}>
            <AlertDialogContent
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Import</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    The file contains rows where the booking channel and Order ID do not match. Import these rows
                    anyway?
                  </p>
                  <ul className="list-disc pl-5 text-sm">
                    <li>
                      {confirmImportRequest?.anomalySummary.paymentCompletedWithoutOrderId ?? 0}{" "}
                      Payment Completed row(s) without an Order ID
                    </li>
                    <li>
                      {confirmImportRequest?.anomalySummary.manualWalkInWithOrderId ?? 0}{" "}
                      Manual/Walk-in row(s) with an Order ID
                    </li>
                  </ul>
                  {confirmImportRequest && confirmImportRequest.anomalies.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-lg border bg-background">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="px-3 py-2 text-left font-semibold">Row</th>
                            <th className="px-3 py-2 text-left font-semibold">Customer</th>
                            <th className="px-3 py-2 text-left font-semibold">Order ID</th>
                            <th className="px-3 py-2 text-left font-semibold">Channel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmImportRequest.anomalies.map((item, index) => (
                            <tr
                              key={`${item.rowNumber}-${index}`}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-3 py-2 font-medium">{item.rowNumber}</td>
                              <td className="px-3 py-2">{item.customerName || "-"}</td>
                              <td className="px-3 py-2">{item.orderId || "-"}</td>
                              <td className="px-3 py-2">
                                {item.type === "payment_completed_without_order_id"
                                  ? "Payment Completed (no Order ID)"
                                  : "Manual/Walk-in (has Order ID)"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleConfirmImport(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => handleConfirmImport(true)}>
                  Import Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {dataSources.map((source) => (
    <Card key={source.id} className="h-full border-border bg-card shadow-sm">
      <CardContent className="flex h-full flex-col pt-6">
        <div className="mb-4 flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              source.status === "connected"
                ? "bg-primary/10"
                : source.status === "error"
                  ? "bg-destructive/10"
                  : "bg-muted"
            }`}
          >
            {source.type === "api" && (
              <Zap
                className={`h-5 w-5 ${
                  source.status === "connected"
                    ? "text-primary"
                    : source.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              />
            )}

            {source.type === "database" && (
              <Database
                className={`h-5 w-5 ${
                  source.status === "connected"
                    ? "text-primary"
                    : source.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              />
            )}

            {source.type === "file" && (
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant={
                source.status === "connected"
                  ? "default"
                  : source.status === "error"
                    ? "destructive"
                    : "secondary"
              }
            >
              {source.status}
            </Badge>
            {source.id === "2" && source.tokenStatus === "expired" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The Meta API might need to change the access token. Please try to contact IT Support and check your internet connection regularly.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <h3 className="mb-1 font-semibold">{source.name}</h3>

        <div className="mb-3 flex-1 space-y-1 text-sm text-muted-foreground">
          <p>
            {source.records.toLocaleString()} {source.id === "3" ? "suggestions" : "records"}
          </p>
          <p>Last sync: {source.lastSync}</p>
          {source.id === "1" && (
            <p>Latest transaction: {source.latestTransaction || "No data"}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => triggerSync(source.id)}
          disabled={isSourceSyncDisabled({
            sourceId: source.id,
            sourceStatus: source.status,
            syncingSourceId,
            metaConfigured,
            canSync: canAccessDataCenter,
          })}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              syncingSourceId === source.id || source.status === "syncing" ? "animate-spin" : ""
            }`}
          />
          {getSourceSyncLabel({
            sourceId: source.id,
            sourceStatus: source.status,
            syncingSourceId,
          })}
        </Button>
      </CardContent>
    </Card>
  ))}

  <Card className="h-full border-border bg-card shadow-sm">
    <CardContent className="flex h-full flex-col pt-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          {isRunningMl ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <RefreshCw className="h-5 w-5 text-primary" />
          )}
        </div>

        <Badge variant={isRunningMl ? "secondary" : "default"}>
          {isRunningMl ? "running" : "ready"}
        </Badge>
      </div>

      <h3 className="mb-1 font-semibold">ML Segmentation Engine</h3>

      <div className="mb-3 flex-1 space-y-1 text-sm text-muted-foreground">
        <p>{mlSummary.records.toLocaleString()} customers</p>
        <p>Last run: {mlSummary.lastRun}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        disabled={isRunningMl || !canRunMachineLearning}
        onClick={handleRunMachineLearning}
      >
        {isRunningMl ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running ML...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Run Segmentation
          </>
        )}
      </Button>
    </CardContent>
  </Card>
</div>

{mlMessage && (
  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
    {mlMessage}
  </div>
)}

{mlError && (
  <BusinessErrorAlert
    title={mlError.title}
    message={mlError.message}
    suggestion={mlError.suggestion}
    errorCode={mlError.errorCode}
    technicalDetails={mlError.technicalDetails}
    showTechnicalDetails={canViewTechnicalDetails}
  />
)}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              Format File to Upload
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview the upload structure before using a real transaction file.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">tmp-upload-sample.csv</p>
                  <p className="text-xs text-muted-foreground">CSV, XLSX, or XLS upload structure</p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setTemplatePreviewOpen(true)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View the file structure example.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Activity
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Track the status of data synchronization tasks</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Monitor data import and synchronization progress
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoadingJobs ? (
              <p className="text-sm text-muted-foreground">
                Loading sync history...
              </p>
            ) : syncJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sync history found.
              </p>
            ) : (
              <div className="space-y-4">
                {syncJobs.map((job) => {
                  const config = statusConfig[job.status]
                  const StatusIcon = config.icon
                  const isFileJob =
                    job.type === "file" &&
                    job.id !== "ready" &&
                    job.sourceRecordId !== undefined

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary/80 sm:flex-row sm:items-center"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bg}`}
                      >
                        <StatusIcon
                          className={`h-5 w-5 ${config.color} ${
                            job.status === "processing" ? "animate-spin" : ""
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="truncate font-medium">{job.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {job.type === "file" ? "FILE" : job.type.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Started: {job.startedAt}</span>

                          {job.completedAt && (
                            <span>Completed: {job.completedAt}</span>
                          )}
                          <span>Action by: {job.performedByName || "Unknown user"}</span>
                        </div>

                        {job.businessError && (
                          <BusinessErrorAlert
                            title={job.businessError.title}
                            message={job.businessError.message}
                            suggestion={job.businessError.suggestion}
                            errorCode={job.businessError.errorCode}
                            technicalDetails={job.businessError.technicalDetails}
                            showTechnicalDetails={canViewTechnicalDetails}
                            variant="warning"
                          />
                        )}

                        {(job.status === "processing" || job.status === "queued") && (
                          <div className="w-full sm:w-32">
                            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                              <span>{config.label}</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isFileJob && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleViewRawRows(job)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {job.status === "failed" ? "View Error Details" : "View Cleaned Data"}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {isFileJob && job.status === "completed" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setPendingJob(job)
                                  setDownloadConfirmOpen(true)
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download Report</TooltipContent>
                          </Tooltip>
                        )}

                        {isFileJob && job.status !== "failed" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={!canDeleteImport || removingJobId === job.id}
                                onClick={() => {
                                  setPendingJob(job)
                                  setImpactSummary(null)
                                  void loadJobImpact(job)
                                  setDeleteConfirmOpen(true)
                                }}
                              >
                              {removingJobId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Download report?</AlertDialogTitle>
              <AlertDialogDescription>
                A downloadable report will be prepared for the selected job.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingJob(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingJob) {
                    void handleDownloadReport(pendingJob)
                  }
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this import?</AlertDialogTitle>
              <AlertDialogDescription>
                {isLoadingImpact ? (
                  "Checking what will be deleted..."
                ) : impactSummary ? (
                  <>
                    This will permanently delete {impactSummary.facilityTransactionCount}{" "}
                    transaction(s), {impactSummary.courtHourUsageCount} play-hour record(s),{" "}
                    {impactSummary.rawTransactionCount} raw row(s), and{" "}
                    {impactSummary.orphanCustomerCount} customer profile(s).
                  </>
                ) : (
                  "This permanently removes the selected import history and uploaded data."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingJob(null)
                  setImpactSummary(null)
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void handleConfirmDelete()
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
          <DialogContent
            className="!max-w-none !w-[95vw] !max-h-[90vh] overflow-hidden"
            style={{ width: "95vw", maxWidth: "95vw", maxHeight: "90vh" }}
          >
            <DialogHeader>
              <DialogTitle>Format File to Upload</DialogTitle>
              <DialogDescription>
                Preview of the transaction file structure expected by MaiinSight, including the expected data type for each column.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
              <table className="min-w-[1400px] w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="bg-muted/70">
                    {(templatePreviewData?.headers || []).map((label) => (
                      <th
                        key={label}
                        className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(templatePreviewData?.rows || []).map((row, rowIndex) => (
                    <tr key={`sample-row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      {row.map((value, index) => (
                        <td
                          key={`${rowIndex}-${index}`}
                          className="border-b border-border px-4 py-3 align-top text-sm text-foreground"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!templatePreviewData && (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Loading sample file from <code>/tmp-upload-sample.csv</code>...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={rawModalOpen} onOpenChange={setRawModalOpen}>
          <DialogContent
            className={
              selectedRawJob?.status === "failed"
                ? "!w-[min(96vw,48rem)] !max-w-[min(96vw,48rem)] max-h-[85vh] overflow-y-auto"
                : "max-h-[92vh] !w-[98vw] !max-w-[98vw] !sm:w-[98vw] !sm:max-w-[98vw] overflow-hidden"
            }
          >
            <DialogHeader>
              <DialogTitle>
                {selectedRawJob?.status === "failed" ? "Import Failure Details" : "Cleaned Transaction Data"}
              </DialogTitle>
              <DialogDescription>
                {selectedRawJob
                  ? selectedRawJob.status === "failed"
                    ? `${selectedRawJob.name} - why this import was rejected`
                    : `${selectedRawJob.name} - ${selectedRawJob.records.toLocaleString()} records`
                  : "Preview cleaned transaction data"}
              </DialogDescription>
            </DialogHeader>

            {isLoadingRawRows ? (
              <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading transaction data...
              </div>
                        ) : rawRowsError ? (
              <BusinessErrorAlert
                title={rawRowsError.title}
                message={rawRowsError.message}
                suggestion={rawRowsError.suggestion}
                errorCode={rawRowsError.errorCode}
                technicalDetails={rawRowsError.technicalDetails}
                showTechnicalDetails={canViewTechnicalDetails}
              />
            ) : viewedFailureDetails ? (
              <div className="space-y-3">
                <BusinessErrorAlert
                  title={viewedFailureDetails.title}
                  message={viewedFailureDetails.message}
                  suggestion={viewedFailureDetails.suggestion}
                  errorCode={viewedFailureDetails.errorCode}
                  technicalDetails={viewedFailureDetails.technicalDetails}
                  showTechnicalDetails={canViewTechnicalDetails}
                />

                {viewedFailureDetails.validationErrors && viewedFailureDetails.validationErrors.length > 0 && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-destructive">
                        Invalid rows found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please fix these rows in your CSV or Excel file, then upload again.
                      </p>
                    </div>

                    <div className="max-h-64 overflow-auto rounded-lg border bg-background">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="px-3 py-2 text-left font-semibold">Row</th>
                            <th className="px-3 py-2 text-left font-semibold">Column</th>
                            <th className="px-3 py-2 text-left font-semibold">Value</th>
                            <th className="px-3 py-2 text-left font-semibold">Reason</th>
                          </tr>
                        </thead>

                        <tbody>
                          {viewedFailureDetails.validationErrors.map((item, index) => (
                            <tr
                              key={`${item.rowNumber}-${item.column}-${index}`}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-3 py-2 align-top font-medium">
                                {item.rowNumber}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {item.column}
                              </td>
                              <td className="max-w-[180px] break-words px-3 py-2 align-top text-muted-foreground">
                                {item.value === null ||
                                item.value === undefined ||
                                item.value === ""
                                  ? "-"
                                  : String(item.value)}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {item.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : rawRows.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No transaction data found for this upload history.
              </div>
            ) : (
              <div className="space-y-3 overflow-hidden">
                <p className="text-sm text-muted-foreground">
                  Showing {rawRows.length} cleaned transaction records from the uploaded file.
                </p>

                                <div className="max-h-[68vh] overflow-x-auto overflow-y-auto rounded-xl border bg-muted/20 p-2">
                  <div className="block w-max min-w-max align-top rounded-lg border bg-background shadow-sm">
                    <table className="min-w-max table-auto border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
                        <tr>
                          <th className="sticky left-0 z-30 min-w-[72px] border-b border-r bg-background px-3 py-2 text-left font-semibold whitespace-nowrap">
                            Row
                          </th>

                          {rawHeaders.map((header) => (
                            <th
                              key={header}
                              className="min-w-[160px] border-b border-r bg-background px-3 py-2 text-left font-semibold whitespace-nowrap last:border-r-0 cursor-pointer select-none hover:bg-muted/40"
                              onClick={() => handleSort(header)}
                            >
                              <span className="inline-flex items-center gap-1">
                                {header}
                                {sortColumn === header ? (
                                  <span className="text-xs text-muted-foreground">{sortDirection === "asc" ? "▲" : "▼"}</span>
                                ) : null}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {sortedRows.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/40">
                            <td className="sticky left-0 z-10 border-b border-r bg-background px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {row.rowNumber}
                            </td>

                            {rawHeaders.map((header) => {
                              const value = row.data?.[header]

                              return (
                                <td
                                  key={`${row.id}-${header}`}
                                  className="min-w-[180px] border-b border-r px-3 py-2 align-top whitespace-nowrap last:border-r-0"
                                  title={
                                    value === null || value === undefined
                                      ? "-"
                                      : String(value)
                                  }
                                >
                                  {value === null || value === undefined || value === ""
                                    ? "-"
                                    : String(value)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

























