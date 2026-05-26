"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  Server,
  Zap,
  Loader2,
  Info,
  Trash2,
  Download,
  Play,
  Pause
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

const dataSources: DataSource[] = [
  { id: "1", name: "POS System API", type: "api", status: "connected", lastSync: "2 min ago", records: 125420 },
  { id: "2", name: "CRM Database", type: "database", status: "connected", lastSync: "5 min ago", records: 45230 },
  { id: "3", name: "Marketing Platform", type: "api", status: "connected", lastSync: "15 min ago", records: 8920 },
  { id: "4", name: "Inventory System", type: "api", status: "error", lastSync: "1 hour ago", records: 34560 },
]

const initialSyncJobs: SyncJob[] = [
  { id: "1", name: "Daily Transaction Sync", type: "api", status: "completed", progress: 100, records: 4520, startedAt: "09:00 AM", completedAt: "09:15 AM" },
  { id: "2", name: "Customer Data Import", type: "csv", status: "processing", progress: 67, records: 1840, startedAt: "10:30 AM" },
  { id: "3", name: "Inventory Update", type: "api", status: "queued", progress: 0, records: 0, startedAt: "Scheduled 11:00 AM" },
  { id: "4", name: "Promo Campaign Data", type: "csv", status: "failed", progress: 45, records: 890, startedAt: "08:45 AM", error: "Invalid data format in row 456" },
]

const statusConfig = {
  queued: { color: "text-muted-foreground", bg: "bg-muted", icon: Clock, label: "Queued" },
  processing: { color: "text-chart-2", bg: "bg-chart-2/10", icon: Loader2, label: "Processing" },
  completed: { color: "text-primary", bg: "bg-primary/10", icon: CheckCircle2, label: "Completed" },
  failed: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Failed" },
}

export function DataManagement() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>(initialSyncJobs)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === "text/csv") {
      setUploadFile(files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadFile(files[0])
    }
  }

  const simulateUpload = async () => {
    if (!uploadFile) return
    
    setIsUploading(true)
    setUploadProgress(0)
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }
    
    // Add to sync jobs
    const newJob: SyncJob = {
      id: Date.now().toString(),
      name: uploadFile.name,
      type: "csv",
      status: "processing",
      progress: 0,
      records: 0,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setSyncJobs(prev => [newJob, ...prev])
    setIsUploading(false)
    setUploadFile(null)
    setUploadProgress(0)
    setUploadModalOpen(false)
    
    // Simulate processing
    setTimeout(() => {
      setSyncJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: "completed" as SyncStatus, progress: 100, records: Math.floor(Math.random() * 5000) }
          : job
      ))
    }, 3000)
  }

  const triggerSync = (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId)
    if (!source) return
    
    const newJob: SyncJob = {
      id: Date.now().toString(),
      name: `${source.name} Sync`,
      type: "api",
      status: "queued",
      progress: 0,
      records: 0,
      startedAt: "Starting..."
    }
    
    setSyncJobs(prev => [newJob, ...prev])
    
    // Simulate sync process
    setTimeout(() => {
      setSyncJobs(prev => prev.map(job => 
        job.id === newJob.id ? { ...job, status: "processing" as SyncStatus, progress: 30 } : job
      ))
    }, 1000)
    
    setTimeout(() => {
      setSyncJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: "completed" as SyncStatus, progress: 100, records: Math.floor(Math.random() * 10000) }
          : job
      ))
    }, 4000)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Data Management Center</h1>
            <p className="text-muted-foreground">API synchronization and data import tools</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Data File</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to import data into the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="h-10 w-10 text-primary" />
                        <p className="font-medium">{uploadFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setUploadFile(null)}
                          className="text-destructive"
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
                          <span className="text-primary hover:underline">browse to select</span>
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileSelect}
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
                  
                  <Button 
                    className="w-full" 
                    disabled={!uploadFile || isUploading}
                    onClick={simulateUpload}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
        </div>

        {/* Data Sources */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dataSources.map((source) => (
            <Card key={source.id} className="bg-card border-border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    source.status === "connected" ? "bg-primary/10" : 
                    source.status === "error" ? "bg-destructive/10" : "bg-muted"
                  }`}>
                    {source.type === "api" && <Zap className={`h-5 w-5 ${
                      source.status === "connected" ? "text-primary" : 
                      source.status === "error" ? "text-destructive" : "text-muted-foreground"
                    }`} />}
                    {source.type === "database" && <Database className={`h-5 w-5 ${
                      source.status === "connected" ? "text-primary" : 
                      source.status === "error" ? "text-destructive" : "text-muted-foreground"
                    }`} />}
                    {source.type === "file" && <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <Badge variant={source.status === "connected" ? "default" : source.status === "error" ? "destructive" : "secondary"}>
                    {source.status}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1">{source.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {source.records.toLocaleString()} records • Last sync: {source.lastSync}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={() => triggerSync(source.id)}
                  disabled={source.status === "error"}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sync Jobs */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Sync Jobs
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Track the status of data synchronization tasks</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>Monitor data import and synchronization progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncJobs.map((job) => {
                const config = statusConfig[job.status]
                const StatusIcon = config.icon
                
                return (
                  <div 
                    key={job.id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary/80 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${config.color} ${job.status === "processing" ? "animate-spin" : ""}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{job.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {job.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Started: {job.startedAt}</span>
                        {job.completedAt && <span>Completed: {job.completedAt}</span>}
                        {job.records > 0 && <span>{job.records.toLocaleString()} records</span>}
                      </div>
                      {job.error && (
                        <p className="text-sm text-destructive mt-1">{job.error}</p>
                      )}
                    </div>
                    
                    {(job.status === "processing" || job.status === "queued") && (
                      <div className="w-full sm:w-32">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
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
                      {job.status === "failed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Retry</TooltipContent>
                        </Tooltip>
                      )}
                      {job.status === "completed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download Report</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
