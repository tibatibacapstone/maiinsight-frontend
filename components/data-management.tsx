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
import { getApiUrl } from "@/lib/api"
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
  name: string
  type: "api" | "file"
  status: SyncStatus
  progress: number
  records: number
  startedAt: string
  completedAt?: string
  error?: string
  businessError?: BusinessErrorState | null
}

interface DataSource {
  id: string
  name: string
  type: "api" | "database" | "file"
  status: "connected" | "disconnected" | "error"
  lastSync: string
  records: number
}

interface FriendlyErrorResponse {
  errorCode?: string
  message?: string
  suggestion?: string
  technicalMessage?: string
}

interface UploadImportResponse {
  success: boolean
  errorCode?: string
  message: string
  suggestion?: string
  technicalMessage?: string
  data?: {
    batchId: number
    fileName: string
    rowCount: number
    headers: string[]
    status: string
  }
}

interface ImportJobResponse {
  id: number
  fileName: string
  rowCount: number
  status: string
  createdAt: string
  updatedAt?: string
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
    rows?: RawTransactionRow[]
  }
}

interface BusinessErrorState {
  title: string
  message: string
  suggestion?: string | null
  errorCode?: string | null
  technicalDetails?: string | null
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
}

interface AiStrategyResponse {
  success?: boolean
  message?: string
}
interface PlaytimeMlLatestResponse {
  success: boolean
  message?: string
  data?: {
    id: number
    totalSessions: number
    totalCustomers: number
    clusterCount: number
    createdAt: string
  }
}

interface PlaytimeMlRunResponse {
  success: boolean
  message?: string
  data?: {
    runId?: number
    totalSessions?: number
    totalCustomers?: number
  }
}

interface CombinedMlSummary {
  playtimeSessions: number
  playtimeCustomers: number
  segmentationCustomers: number
  selectedK: number | null
}

interface MlSummary {
  lastRun: string
  records: number
  totalCustomers: number
} 

const defaultDataSources: DataSource[] = [
  {
    id: "1",
    name: "MaiinSight Database",
    type: "database",
    status: "disconnected",
    lastSync: "Not synced yet",
    records: 0,
  },
  {
    id: "2",
    name: "Meta Graph API",
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
    "Please make sure the file follows the required MaiinSight transaction template, then try again. Contact IT Support if the issue continues.",
  errorCode: response?.errorCode || "IMPORT_FAILED",
  technicalDetails: response?.technicalMessage || null,
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
const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

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

const getDisplayNow = () => formatDisplaySyncTime(new Date().toISOString())

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

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
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
    id: String(job.id),
    name: job.fileName,
    type: "file",
    status,
    progress: status === "completed" ? 100 : status === "processing" ? 60 : 0,
    records: job.rowCount || 0,
    startedAt: formatBackendTime(job.createdAt),
    completedAt:
      status === "completed"
        ? formatBackendTime(job.updatedAt || job.createdAt)
        : undefined,
  }
}

const getRawCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-"

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

const escapeCsvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
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

  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [removingJobId, setRemovingJobId] = useState<string | null>(null)

  const [rawModalOpen, setRawModalOpen] = useState(false)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)
  const [selectedRawJob, setSelectedRawJob] = useState<SyncJob | null>(null)
  const [rawRows, setRawRows] = useState<RawTransactionRow[]>([])
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [isLoadingRawRows, setIsLoadingRawRows] = useState(false)
  const [rawRowsError, setRawRowsError] = useState<BusinessErrorState | null>(null)
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)
  const [pendingJob, setPendingJob] = useState<SyncJob | null>(null)

  const userRole = getStoredRole()
  const canAccessDataCenter =
    userRole === USER_ROLES.OPERATIONAL|| userRole === USER_ROLES.IT_SUPPORT
  const canManageCsv = canAccessFeature(userRole, "uploadCsv")
  const canRunMachineLearning =
    userRole === USER_ROLES.OPERATIONAL || userRole === USER_ROLES.IT_SUPPORT
  const canViewTechnicalDetails = userRole === USER_ROLES.IT_SUPPORT

 const fetchDataCenter = useCallback(async () => {
  try {
    const token = getStoredToken()

    if (!token) {
      setDataSources(defaultDataSources)
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
      return
    }

    const latestBatch = summaryResult.data.latestBatch
    const latestBatchTime = latestBatch?.updatedAt || latestBatch?.createdAt || null
    const metaConfigured = Boolean(metaStatusResult?.success && metaStatusResult?.data?.configured)
    const latestMetaSync = metaStatusResult?.data?.latestSync?.startedAt || null

    setDataSources([
      {
        id: "1",
        name: "MaiinSight Database",
        type: "database",
        status: summaryResult.data.totalFacilityTransactions > 0 ? "connected" : "disconnected",
        lastSync: formatDisplaySyncTime(latestBatchTime),
        records: Number(summaryResult.data.totalFacilityTransactions || 0),
      },
      {
        id: "2",
        name: "Meta Graph API",
        type: "api",
        status: metaConfigured
          ? metaStatusResult?.data?.latestSync?.status?.toLowerCase() === "failed"
            ? "error"
            : "connected"
          : "disconnected",
        lastSync: metaConfigured ? formatDisplaySyncTime(latestMetaSync) : "Not connected",
        records: 0,
      },
      {
        id: "3",
        name: "AI Strategy Engine",
        type: "api",
        status: "connected",
        lastSync: latestBatchTime ? formatDisplaySyncTime(latestBatchTime) : "Ready when data is available",
        records: Number(summaryResult.data.totalBatches || 0),
      },
    ])
  } catch (error) {
    console.warn("Failed to fetch data center summary:", error)
    setDataSources(defaultDataSources)
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
          const response = await fetch(getApiUrl("/imports/jobs"), {
            method: "GET",
            cache: "no-store",
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
          const response = await fetch(getApiUrl("/ai-strategy/generate"), {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              selected_filters: {
                source: "data-center",
                sourceName: source.name,
                triggeredFrom: "Sync Now",
              },
              customer_segment_summary: {},
              business_context: {},
              promotion_context: {},
            }),
          })

          const result: AiStrategyResponse = await response.json()

          if (!response.ok || result.success === false) {
            throw new Error(result.message || "Failed to generate AI strategy.")
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

    const response = await fetch(getApiUrl("/ml/playtime/latest"), {
      method: "GET",
      cache: "no-store",
      headers: {
        ...getAuthHeaders(),
      },
    })

    const result: PlaytimeMlLatestResponse = await response
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

    setMlSummary({
      lastRun: formatDisplaySyncTime(result.data.createdAt),
      records: result.data.totalSessions || 0,
      totalCustomers: result.data.totalCustomers || 0,
    })
  } catch (error) {
    console.warn("Failed to fetch ML summary:", error)

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

  const handleUploadImport = async () => {
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
      setUploadProgress(10)
      setUploadMessage("")
      setUploadError(null)

      const newJob: SyncJob = {
        id: jobId,
        name: currentFile.name,
        type: "file",
        status: "processing",
        progress: 10,
        records: 0,
        startedAt,
      }

      setSyncJobs((prev) => [newJob, ...prev])

      const formData = new FormData()
      formData.append("file", currentFile)

      setUploadProgress(40)

      const response = await fetch(getApiUrl("/imports/upload-file"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      setUploadProgress(75)

      const result: UploadImportResponse | null = await response.json().catch(() => null)

      if (!response.ok || !result?.success || !result.data) {
        throw createFriendlyImportError(result, "Import Failed")
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

      setUploadError(friendlyError)
      toast.error(friendlyError.title, {
        description: friendlyError.message,
      })

      setSyncJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "failed",
                progress: 0,
                error: friendlyError.message,
              }
            : job
        )
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleRunMachineLearning = async () => {
    if (!canRunMachineLearning) {
      const businessError = createBusinessErrorState({
        title: "Access Denied",
        message: "Machine learning is available to Marketing Operational and IT Support only.",
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

      const playtimeResponse = await fetch(getApiUrl("/ml/playtime/run"), {
        method: "POST",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
        },
      })

      const playtimeResult: PlaytimeMlRunResponse | null = await playtimeResponse
        .json()
        .catch(() => null)

      if (!playtimeResponse.ok || !playtimeResult?.success) {
        throw new Error(playtimeResult?.message || "Failed to run play-time behavior ML.")
      }

      const segmentationResult = await runCustomerSegmentation()

      const summary: CombinedMlSummary = {
        playtimeSessions: playtimeResult.data?.totalSessions || 0,
        playtimeCustomers: playtimeResult.data?.totalCustomers || 0,
        segmentationCustomers: segmentationResult.run?.totalCustomers || 0,
        selectedK: segmentationResult.selectedK,
      }

      await fetchMlSummary()
      await fetchDataCenter()
      await fetchSyncJobs()

      publishLastSyncTime()
      notifySegmentationUpdated()

      setMlMessage(
        `Machine learning completed. Play-Time Behavior processed ${summary.playtimeSessions.toLocaleString()} sessions, and Customer Value Segmentation processed ${summary.segmentationCustomers.toLocaleString()} customers with Business Segmentation K: ${summary.selectedK ?? 4}.`
      )

      toast.success("Machine learning completed", {
        description: `Customer Value Segmentation is ready with Business Segmentation K: ${summary.selectedK ?? 4}.`,
      })
    } catch (error) {
      const businessError = createBusinessErrorState({
        title: "Machine Learning Failed",
        message: "We couldn't complete the machine learning run.",
        suggestion: "Please try again after the latest data import is complete. Contact IT Support if the issue continues.",
        errorCode: "ML_RUN_FAILED",
        technicalDetails:
          error instanceof Error ? error.message : "Failed to run machine learning.",
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

    const response = await fetch(getApiUrl(`/imports/batches/${job.id}/rows`), {
      method: "GET",
      cache: "no-store",
      headers: getAuthHeaders(),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.success) {
      throw createFriendlyImportError(result, "Raw Data Preview Failed")
    }

    const rows = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.rows)
        ? result.data.rows
        : []

    setRawRows(rows)

    if (rows.length > 0) {
      const firstRowData = rows[0]?.data || {}
      setRawHeaders(Object.keys(firstRowData))
    }
  } catch (error) {
    const friendlyError =
      error && typeof error === "object" && "title" in error
        ? (error as BusinessErrorState)
        : createBusinessErrorState({
            title: "Raw Data Preview Failed",
            message: "We couldn't load the uploaded transaction preview.",
            suggestion: "Please try again. Contact IT Support if the issue continues.",
            errorCode: "RAW_DATA_PREVIEW_FAILED",
            technicalDetails:
              error instanceof Error ? error.message : "Failed to load raw data.",
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

    const response = await fetch(getApiUrl(`/imports/jobs/${job.id}`), {
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

  const handleConfirmDelete = async () => {
    if (!pendingJob) return

    const job = pendingJob
    setDeleteConfirmOpen(false)
    setPendingJob(null)
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
      const response = await fetch(getApiUrl(`/imports/batches/${job.id}/rows`), {
        method: "GET",
        cache: "no-store",
        headers: getAuthHeaders(),
      })

      const result: RawRowsResponse = await response.json()

      const rows = result.data?.rows ?? []

      if (!response.ok || !Array.isArray(rows)) {
        throw new Error(result.message || "Failed to prepare download.")
      }

      const headers = Array.from(
        new Set(rows.flatMap((row) => Object.keys(row.data || {}))),
      )

      const csvLines = [
        ["Row", ...headers].map(escapeCsvCell).join(","),
        ...rows.map((row) =>
          [row.rowNumber, ...headers.map((header) => getRawCellValue(row.data?.[header]))]
            .map(escapeCsvCell)
            .join(","),
        ),
      ]

      const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(csvBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${job.name.replace(/\.csv$/i, "")}_raw_export.csv`
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
      toast.success(`Raw export ready`, {
        description: `${job.name}_raw_export.csv has been downloaded.`,
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

            <DialogContent className="w-[min(96vw,48rem)] max-w-none p-0">
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
                      <span>Uploading...</span>
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
                  <BusinessErrorAlert
                    title={uploadError.title}
                    message={uploadError.message}
                    suggestion={uploadError.suggestion}
                    errorCode={uploadError.errorCode}
                    technicalDetails={uploadError.technicalDetails}
                    showTechnicalDetails={canViewTechnicalDetails}
                  />
                )}
                <Button
                  className="w-full shrink-0"
                  disabled={!canManageCsv || !uploadFile || isUploading}
                  onClick={handleUploadImport}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Start Import"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {dataSources.map((source) => (
    <Card key={source.id} className="border-border bg-card shadow-sm">
      <CardContent className="pt-6">
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
        </div>

        <h3 className="mb-1 font-semibold">{source.name}</h3>

        <p className="mb-3 text-sm text-muted-foreground">
          {source.records.toLocaleString()} records - Last sync:{" "}
          {source.lastSync}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => triggerSync(source.id)}
          disabled={source.status === "error" || syncingSourceId === source.id}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              syncingSourceId === source.id ? "animate-spin" : ""
            }`}
          />
          {syncingSourceId === source.id ? "Syncing..." : "Sync Now"}
        </Button>
      </CardContent>
    </Card>
  ))}

  <Card className="border-border bg-card shadow-sm">
    <CardContent className="pt-6">
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

      <h3 className="mb-1 font-semibold">Machine Learning Engine</h3>

      <p className="mb-1 text-sm text-muted-foreground">
        {mlSummary.records.toLocaleString()} sessions - Last run:{" "}
        {mlSummary.lastRun}
      </p>

      <p className="mb-3 text-xs text-muted-foreground">
        {mlSummary.totalCustomers.toLocaleString()} customers processed
      </p>

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
            Run Machine Learning
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
                  <p className="truncate text-sm font-medium">maiin-upload-template.csv</p>
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
              Sync Jobs
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
                  const isFileJob = job.type === "file" && job.id !== "ready"

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
                            <TooltipContent>View Cleaned Data</TooltipContent>
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

                        {isFileJob ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={!canManageCsv || removingJobId === job.id}
                                onClick={() => {
                                  setPendingJob(job)
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
                This permanently removes the selected import history and uploaded data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingJob(null)}>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Format File to Upload</DialogTitle>
              <DialogDescription>
                Compact preview of the transaction file structure expected by MaiinSight.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Order ID", "ORD-001"],
                ["Nama", "Test Customer"],
                ["Tanggal Transaksi", "2026-06-27"],
                ["Tanggal Main", "2026-06-28"],
                ["Jam Main", "08:00 - 09:00"],
                ["Venue", "Mini Soccer"],
                ["Lapangan", "Court 1"],
                ["Harga Bersih", "100000"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-muted/20 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={rawModalOpen} onOpenChange={setRawModalOpen}>
          <DialogContent className="max-h-[92vh] max-w-[98vw] overflow-hidden sm:max-w-[98vw]">
            <DialogHeader>
              <DialogTitle>Raw Uploaded Data</DialogTitle>
              <DialogDescription>
                {selectedRawJob
                  ? `${selectedRawJob.name} - ${selectedRawJob.records.toLocaleString()} records`
                  : "Preview uploaded transaction data"}
              </DialogDescription>
            </DialogHeader>

            {isLoadingRawRows ? (
              <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading raw data...
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
            ) : rawRows.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No raw data found for this upload history.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Showing first {rawRows.length} rows from the uploaded transaction file.
                </p>

                                <div className="max-h-[68vh] overflow-auto rounded-xl border bg-muted/20 p-2">
                  <div className="inline-block min-w-full align-top rounded-lg border bg-background shadow-sm">
                    <table className="min-w-max border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
                        <tr>
                          <th className="sticky left-0 z-30 min-w-[72px] border-b border-r bg-background px-3 py-2 text-left font-semibold">
                            Row
                          </th>

                          {rawHeaders.map((header) => (
                            <th
                              key={header}
                              className="min-w-[160px] border-b border-r bg-background px-3 py-2 text-left font-semibold last:border-r-0"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {rawRows.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/40">
                            <td className="sticky left-0 z-10 border-b border-r bg-background px-3 py-2 text-muted-foreground">
                              {row.rowNumber}
                            </td>

                            {rawHeaders.map((header) => {
                              const value = row.data?.[header]

                              return (
                                <td
                                  key={`${row.id}-${header}`}
                                  className="min-w-[180px] border-b border-r px-3 py-2 align-top whitespace-pre-wrap break-words last:border-r-0"
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

























