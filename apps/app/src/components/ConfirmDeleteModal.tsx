"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmDeleteModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    itemName: string
    isDeleting?: boolean
}

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
    isDeleting = false
}: ConfirmDeleteModalProps) {
    const handleConfirm = () => {
        onConfirm()
        // Don't close immediately - let the parent handle closing after deletion completes
    }

    const handleCancel = () => {
        if (!isDeleting) {
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
            <DialogContent className="w-80 max-w-[90vw] p-0 m-0">
                <DialogHeader className="p-4 pb-3">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-sm font-medium text-gray-900 leading-5">
                                {title}
                            </DialogTitle>
                            <p className="text-xs text-gray-600 mt-1">
                                {message}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-4 pb-4">
                    <div className="ml-9 space-y-3">
                        <div className="p-2 bg-gray-50 rounded border">
                            <p className="text-xs font-medium text-gray-900 truncate">
                                "{itemName}"
                            </p>
                        </div>
                        <p className="text-xs text-gray-500">
                            This action cannot be undone.
                        </p>
                    </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-transparent rounded hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
} 