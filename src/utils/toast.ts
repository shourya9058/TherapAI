import { toast } from "react-hot-toast"

type ToastType = "success" | "error" | "info" | "loading"

const showToast = (message: string, type: ToastType = "info", options: any = {}): string => {
  const defaultOptions = {
    duration: type === "error" ? 4000 : type === "loading" ? Number.POSITIVE_INFINITY : 3000,
    position: "top-center" as const,
    style: {
      background:
        type === "success" ? "#10b981" : type === "error" ? "#ef4444" : type === "loading" ? "#3b82f6" : "#6b7280",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "500",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    },
    ...options,
  }

  let toastId = ""

  switch (type) {
    case "success":
      toastId = toast.success(message, defaultOptions) as unknown as string
      break
    case "error":
      toastId = toast.error(message, defaultOptions) as unknown as string
      break
    case "loading":
      toastId = toast.loading(message, defaultOptions) as unknown as string
      break
    default:
      toastId = toast(message, defaultOptions) as unknown as string
  }

  return toastId
}

export const showSuccess = (message: string, options?: any): string => showToast(message, "success", options)

export const showError = (message: string, options?: any): string => showToast(message, "error", options)

export const showLoading = (message: string, options?: any): string => showToast(message, "loading", options)

export const showInfo = (message: string, options?: any): string => showToast(message, "info", options)

export const dismissToast = (toastId?: string): void => {
  if (toastId) {
    toast.dismiss(toastId)
  } else {
    toast.dismiss()
  }
}

export default showToast
