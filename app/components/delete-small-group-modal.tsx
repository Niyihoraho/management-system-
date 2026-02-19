"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteSmallGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  smallGroupName: string
  isLoading?: boolean
}

export function DeleteSmallGroupModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  smallGroupName, 
  isLoading = false 
}: DeleteSmallGroupModalProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="top" className="h-auto w-full max-w-md mx-auto">
        <div className="py-8">
          <SheetHeader className="pb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <SheetTitle className="text-xl text-destructive">Delete Small Group</SheetTitle>
            <SheetDescription className="text-base">
              Are you sure you want to delete <strong>{smallGroupName}</strong>? This action cannot be undone.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                <div className="text-sm text-destructive">
                  <p className="font-medium mb-1">Warning:</p>
                  <p>This will permanently remove the small group and all associated data from the system.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                className="flex-1" 
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  "Deleting..."
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Small Group
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
