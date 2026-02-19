"use client"

import * as React from "react"
import { toast } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    action?: React.ReactNode
    variant?: "default" | "destructive"
}

export function useToast() {
    return {
        toast: ({ title, description, variant, action }: ToastProps) => {
            if (variant === "destructive") {
                toast.error(title, {
                    description,
                    action,
                })
            } else {
                toast.success(title, {
                    description,
                    action,
                })
            }
        },
        dismiss: (toastId?: string) => toast.dismiss(toastId),
    }
}
