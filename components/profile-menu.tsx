"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, LogOut, Trash2 } from "lucide-react"

import { getApiUrl } from "@/lib/api"
import { getAuthHeaders, getRoleDisplayName, UserRole } from "@/lib/roles"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useToast } from "@/components/ui/use-toast"

interface ProfileMenuProps {
  userRole: UserRole
  onLogout: () => void
}

const MAX_AVATAR_SIZE = 256
const AVATAR_BYTE_LIMIT = 1024 * 1024

const getInitials = (name?: string | null, role?: UserRole): string => {
  if (name?.trim()) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
  }
  const roleName = role ? getRoleDisplayName(role) : "User"
  return roleName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

const downscaleImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("The image could not be read."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("The image could not be opened."))
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_SIZE / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("The image could not be processed."))
          return
        }
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.9))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

export function ProfileMenu({ userRole, onLogout }: ProfileMenuProps) {
  const { toast } = useToast()
  const { user, updateProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarBusy, setAvatarBusy] = useState(false)
  const [nameValue, setNameValue] = useState(user?.name || "")
  const [nameBusy, setNameBusy] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)

  const displayName = user?.name || ""
  const initials = getInitials(displayName, userRole)
  const hasAvatar = Boolean(user?.avatar)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file." })
      return
    }

    setAvatarBusy(true)
    try {
      let dataUrl = await downscaleImage(file)
      if (BufferByteLength(dataUrl) > AVATAR_BYTE_LIMIT) {
        const smaller = await recompress(dataUrl)
        if (smaller) dataUrl = smaller
      }
      if (BufferByteLength(dataUrl) > AVATAR_BYTE_LIMIT) {
        throw new Error("The image is too large (max 1 MB).")
      }
      const error = await updateProfile({ avatar: dataUrl })
      if (error) throw new Error(error)
      toast({ title: "Profile photo updated." })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "The photo could not be uploaded.",
      })
    } finally {
      setAvatarBusy(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true)
    try {
      const error = await updateProfile({ avatar: null })
      if (error) throw new Error(error)
      toast({ title: "Profile photo removed." })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "The photo could not be removed.",
      })
    } finally {
      setAvatarBusy(false)
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) {
      toast({ title: "Name cannot be empty." })
      return
    }
    setNameBusy(true)
    try {
      const error = await updateProfile({ name: trimmed })
      if (error) throw new Error(error)
      toast({ title: "Name updated." })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "The name could not be saved.",
      })
    } finally {
      setNameBusy(false)
    }
  }

  const handleRequestCode = async () => {
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters." })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match." })
      return
    }
    setPasswordBusy(true)
    try {
      const response = await fetch(getApiUrl("/auth/change-password/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || "The code could not be sent.")
      }
      setCodeSent(true)
      toast({ title: result?.message || "Confirmation code sent to your email." })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "The code could not be sent.",
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleConfirmPassword = async () => {
    setPasswordBusy(true)
    try {
      const response = await fetch(getApiUrl("/auth/change-password/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ code, newPassword }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || "The password could not be updated.")
      }
      setNewPassword("")
      setConfirmPassword("")
      setCode("")
      setCodeSent(false)
      toast({ title: result?.message || "Password updated successfully." })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "The password could not be updated.",
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <DropdownMenuContent align="end" className="w-80">
      <DropdownMenuLabel className="flex items-center gap-3">
        <Avatar className="h-11 w-11 border border-border">
          {hasAvatar && <AvatarImage src={user?.avatar || ""} alt={displayName} />}
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{displayName || getRoleDisplayName(userRole)}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email || ""}</span>
          <span className="block text-[11px] capitalize text-muted-foreground/80">
            {getRoleDisplayName(userRole)}
          </span>
        </span>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <div className="flex items-center gap-2 px-2 py-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={avatarBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {hasAvatar ? "Change photo" : "Upload photo"}
        </Button>
        {hasAvatar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            disabled={avatarBusy}
            onClick={handleRemoveAvatar}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      <DropdownMenuSeparator />

      <div className="space-y-2 px-2 py-1.5">
        <Input
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
          placeholder="Display name"
          maxLength={100}
        />
        <Button type="button" size="sm" className="w-full" disabled={nameBusy} onClick={handleSaveName}>
          {nameBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save name
        </Button>
      </div>

      <DropdownMenuSeparator />

      <div className="space-y-2 px-2 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">Change password</p>
        <Input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password"
          disabled={codeSent}
        />
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          disabled={codeSent}
        />
        {codeSent ? (
          <div className="space-y-2">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={passwordBusy || code.length < 6}
              onClick={handleConfirmPassword}
            >
              {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={passwordBusy}
            onClick={handleRequestCode}
          >
            {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send confirmation code
          </Button>
        )}
      </div>

      <DropdownMenuSeparator />

      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start px-2 text-destructive hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </DropdownMenuContent>
  )
}

const BufferByteLength = (value: string): number => {
  let bytes = 0
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index)
    if (codePoint <= 0x7f) bytes += 1
    else if (codePoint <= 0x7ff) bytes += 2
    else if (codePoint <= 0xffff) bytes += 3
    else {
      bytes += 4
      index += 1
    }
  }
  return bytes
}

const recompress = (dataUrl: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(img.width * 0.6))
      canvas.height = Math.max(1, Math.round(img.height * 0.6))
      const context = canvas.getContext("2d")
      if (!context) {
        resolve(null)
        return
      }
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.7))
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
