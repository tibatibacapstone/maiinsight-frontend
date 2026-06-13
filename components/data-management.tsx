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
import { toast } from "sonner"
import {
  getStoredRole,
  getStoredToken,
  getAuthHeaders,
  canAccessFeature,
  USER_ROLES,
} from "@/lib/roles"
import { getApiUrl } from "@/lib/api"
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
  Play,
  Pause,
  Eye,
  type LucideIcon,
} from "lucide-react"

type SyncStatus = "queued" | "processing" | "completed" | "failed"

interface SyncJob {
  id: string
  name: string
  type: "api" | "csv"
  status: SyncStatus
  progress: number
  records: number
  startedAt: string
  completedAt?: string
  error?: string
}

interface DataSource {
  id: string
  name: string
  type: "api" | "database" | "file"
  status: "connected" | "disconnected" | "error"
  lastSync: string
  records: number
}

interface UploadCsvResponse {
  success: boolean
  message: string
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

const defaultDataSources: DataSource[] = [
  {
    id: "1",
    name: "MaiinSight Database",
    type: "database",
    status: "connected",
    lastSync: "Not synced yet",
    records: 0,
  },
  {
    id: "2",
    name: "Meta Graph API",
    type: "api",
    status: "connected",
    lastSync: "Not synced yet",
    records: 0,
  },
  {
    id: "3",
    name: "AI Strategy Engine",
    type: "api",
    status: "connected",
    lastSync: "Not synced yet",
    records: 0,
  },
]

const initialSyncJobs: SyncJob[] = [
  {
    id: "ready",
    name: "Data Center Ready",
    type: "api",
    status: "completed",
    progress: 100,
    records: 0,
    startedAt: "Ready",
    completedAt: "Ready",
  },
]

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

const isCsvFile = (file: File) => {
  return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")
}

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
    type: "csv",
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
  const [dataSources, setDataSources] = useState<DataSource[]>(defaultDataSources)
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>(initialSyncJobs)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [uploadError, setUploadError] = useState("")

  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [removingJobId, setRemovingJobId] = useState<string | null>(null)

  const [rawModalOpen, setRawModalOpen] = useState(false)
  const [selectedRawJob, setSelectedRawJob] = useState<SyncJob | null>(null)
  const [rawRows, setRawRows] = useState<RawTransactionRow[]>([])
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [isLoadingRawRows, setIsLoadingRawRows] = useState(false)
  const [rawRowsError, setRawRowsError] = useState("")
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)
  const [pendingJob, setPendingJob] = useState<SyncJob | null>(null)

  const userRole = getStoredRole()
  const canAccessDataCenter =
    userRole === USER_ROLES.MARKETING || userRole === USER_ROLES.IT_SUPPORT
  const canManageCsv = canAccessFeature(userRole, "uploadCsv")

  const fetchDataCenter = useCallback(async () => {
    const token = getStoredToken()

    if (!token) {
      setDataSources(defaultDataSources)
      return
    }

    try {
      const response = await fetch(getApiUrl("/dashboard/data-center"), {
        method: "GET",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
        },
      })

      const result: DataCenterResponse = await response.json()

      if (!response.ok || !result?.dataCenter?.sources) {
        throw new Error("Failed to fetch data center summary.")
      }

      setDataSources(
        result.dataCenter.sources.map((source) => ({
          ...source,
          lastSync: formatDisplaySyncTime(source.lastSync),
        })),
      )
    } catch (error) {
      console.error("Failed to fetch data center summary:", error)
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

  const canAccess = userRole === USER_ROLES.MARKETING || userRole === USER_ROLES.IT_SUPPORT
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

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          `Failed to fetch import jobs. Status: ${response.status}`,
      )
    }

    if (!result?.success || !Array.isArray(result.data)) {
      throw new Error("Invalid response format from import jobs API.")
    }

    const mappedJobs = result.data.map(mapImportJobToSyncJob)

    setSyncJobs(mappedJobs.length > 0 ? mappedJobs : initialSyncJobs)
    publishLastSyncTime()
  } catch (error) {
    console.error("Failed to fetch sync jobs:", error)
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

  useEffect(() => {
    fetchSyncJobs()
  }, [fetchSyncJobs])

  useEffect(() => {
    fetchDataCenter()
  }, [fetchDataCenter])

  const resetUploadState = () => {
    setUploadFile(null)
    setUploadProgress(0)
    setUploadMessage("")
    setUploadError("")
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
    setUploadError("")

    const files = e.dataTransfer.files

    if (!files || files.length === 0) return

    const file = files[0]

    if (!isCsvFile(file)) {
      setUploadError("Only CSV files are allowed.")
      return
    }

    setUploadFile(file)
  }, [])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadMessage("")
    setUploadError("")

    const files = e.target.files

    if (!files || files.length === 0) return

    const file = files[0]

    if (!isCsvFile(file)) {
      setUploadError("Only CSV files are allowed.")
      return
    }

    setUploadFile(file)
  }

  const handleUploadCsv = async () => {
  const userRole = getStoredRole()
  if (!canAccessFeature(userRole, "uploadCsv")) {
    const message = "Upload is available to Marketing and IT Support only."
    setUploadError(`Access denied: ${message}`)
    toast.error("Access denied", {
      description: message,
    })
    return
  }

  if (!uploadFile) {
    setUploadError("Please select a CSV file first.")
    return
  }

  const currentFile = uploadFile
  const jobId = `csv-${Date.now()}`
  const startedAt = getCurrentTime()

  try {
    setIsUploading(true)
    setUploadProgress(10)
    setUploadMessage("")
    setUploadError("")

    // lanjutkan code lama kamu di bawah sini...

      const newJob: SyncJob = {
        id: jobId,
        name: currentFile.name,
        type: "csv",
        status: "processing",
        progress: 10,
        records: 0,
        startedAt,
      }

      setSyncJobs((prev) => [newJob, ...prev])

      const formData = new FormData()
      formData.append("file", currentFile)

      setUploadProgress(40)

      const response = await fetch(getApiUrl("/imports/upload-csv"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    })

      setUploadProgress(75)

      const result: UploadCsvResponse = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message ||
            "Failed to upload CSV file. Please check your login and try again.",
        )
      }

      setUploadProgress(100)

      setUploadMessage(
        `Upload success! ${result.data.rowCount.toLocaleString()} rows imported from ${result.data.fileName}.`,
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
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed."

      setUploadError(errorMessage)
      toast.error("Upload failed", {
        description: errorMessage,
      })

      setSyncJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "failed",
                progress: 0,
                error: errorMessage,
              }
            : job,
        ),
      )
    } finally {
      setIsUploading(false)
    }
  }

const handleViewRawRows= async (job: SyncJob) => {
  try {
    setSelectedRawJob(job)
    setRawModalOpen(true)
    setIsLoadingRawRows(true)
    setRawRowsError("")
    setRawRows([])
    setRawHeaders([])

    const response = await fetch(getApiUrl(`/imports/batches/${job.id}/rows`), {
  method: "GET",
  cache: "no-store",
  headers: getAuthHeaders(),
})
    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch raw transaction rows.")
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load raw data."

    setRawRowsError(errorMessage)
  } finally {
    setIsLoadingRawRows(false)
  }
}

  const handleRemoveJob = async (job: SyncJob) => {
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
              API synchronization and data import tools
            </p>
          </div>

          <Dialog open={uploadModalOpen} onOpenChange={handleDialogOpenChange} >
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!canManageCsv}>
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[min(96vw,48rem)] max-w-none p-0">
              <div className="border-b px-6 py-5">
                <DialogHeader className="text-left">
                  <DialogTitle>Upload Data File</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to import transaction data into MaiinSight.
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
                          setUploadError("")
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
                        Drag and drop your CSV file here, or
                      </p>

                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">
                          browse to select
                        </span>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </Label>
                    </div>
                  )}
                </div>

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
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    {uploadError}
                  </div>
                )}
                <Button
                  className="w-full shrink-0"
                  disabled={!canManageCsv || !uploadFile || isUploading}
                  onClick={handleUploadCsv}
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
                  {source.records.toLocaleString()} records • Last sync:{" "}
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
                    className={`h-4 w-4 ${syncingSourceId === source.id ? "animate-spin" : ""}`}
                  />
                  {syncingSourceId === source.id ? "Syncing..." : "Sync Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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
                  const isCsvJob = job.type === "csv" && job.id !== "ready"

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

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="truncate font-medium">{job.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {job.type.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Started: {job.startedAt}</span>

                          {job.completedAt && (
                            <span>Completed: {job.completedAt}</span>
                          )}

                          {job.records > 0 && (
                            <span>{job.records.toLocaleString()} records</span>
                          )}
                        </div>

                        {job.error && (
                          <p className="mt-1 text-sm text-destructive">
                            {job.error}
                          </p>
                        )}
                      </div>

                      {(job.status === "processing" ||
                        job.status === "queued") && (
                        <div className="w-full sm:w-32">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{config.label}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {job.status === "processing" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pause className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Pause</TooltipContent>
                          </Tooltip>
                        )}

                        {job.status === "queued" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Play className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Start</TooltipContent>
                          </Tooltip>
                        )}

                        {isCsvJob && (
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
                            <TooltipContent>View Raw Data</TooltipContent>
                          </Tooltip>
                        )}

                        {job.status === "completed" && (
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

        <Dialog open={rawModalOpen} onOpenChange={setRawModalOpen}>
          <DialogContent className="max-h-[85vh] max-w-[95vw] overflow-hidden sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>Raw Uploaded Data</DialogTitle>
              <DialogDescription>
                {selectedRawJob
                  ? `${selectedRawJob.name} • ${selectedRawJob.records.toLocaleString()} records`
                  : "Preview uploaded transaction data"}
              </DialogDescription>
            </DialogHeader>

            {isLoadingRawRows ? (
              <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading raw data...
              </div>
            ) : rawRowsError ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {rawRowsError}
              </div>
            ) : rawRows.length === 0 ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No raw data found for this upload history.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Showing first {rawRows.length} rows from uploaded CSV.
                </p>

                <div className="max-h-[55vh] overflow-auto rounded-lg border">
                  <table className="w-full min-w-max border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr>
                        <th className="border-b border-r px-3 py-2 text-left font-semibold">
                          Row
                        </th>

                        {rawHeaders.map((header) => (
                          <th
                            key={header}
                            className="border-b border-r px-3 py-2 text-left font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rawRows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/50">
                          <td className="border-b border-r px-3 py-2 text-muted-foreground">
                            {row.rowNumber}
                          </td>

                          {rawHeaders.map((header) => {
                            const value = row.data?.[header]

                            return (
                              <td
                                key={`${row.id}-${header}`}
                                className="max-w-[220px] truncate border-b border-r px-3 py-2"
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
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
