import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  feature?: string;
  requiredRole?: string;
  onGoBack?: () => void;
  showButton?: boolean;
}

/**
 * Professional access denied component
 * Used throughout the app for consistent unauthorized/forbidden UI
 */
export function AccessDenied({
  title = "Access Denied",
  message = "You do not have permission to access this resource.",
  feature,
  requiredRole,
  onGoBack,
  showButton = true,
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center shadow-sm">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-destructive">{title}</h2>

        {/* Message */}
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {/* Feature Info */}
        {feature && (
          <div className="mt-4 rounded-md bg-muted/50 p-3">
            <p className="text-sm">
              <span className="font-medium">Feature:</span> {feature}
            </p>
          </div>
        )}

        {/* Required Role Info */}
        {requiredRole && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-md bg-muted/50 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm">
              <span className="font-medium">Required Role:</span> {requiredRole}
            </p>
          </div>
        )}

        {/* Action Button */}
        {showButton && onGoBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGoBack}
            className="mt-6 w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}

        {/* Helper Text */}
        <p className="mt-4 text-xs text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact access denied message (for alerts, inline notifications)
 */
export function AccessDeniedMessage({ feature, requiredRole }: AccessDeniedProps) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      <Lock className="h-4 w-4 flex-shrink-0" />
      <div>
        <strong>Access Denied:</strong>
        {feature && ` ${feature} `}
        {requiredRole && `requires ${requiredRole} role`}
      </div>
    </div>
  );
}
