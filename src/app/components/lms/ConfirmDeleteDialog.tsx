/**
 * Confirm Delete Dialog Component
 * 
 * Reusable confirmation dialog for delete actions with:
 * - Item name display
 * - Warning message
 * - Confirm/Cancel actions
 * 
 * @module ConfirmDeleteDialog
 */

"use client";

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import { GlassButton } from "@/components/ui/glass/GlassButton";

// ============================================================================
// Types
// ============================================================================

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfirmDeleteDialog({
  isOpen,
  title,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-4 md:py-8 flex items-center justify-center">
        <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
          <GlassCard className="overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this {itemType}?
              </p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">
                  {itemName}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
              <GlassButton
                type="button"
                variant="secondary"
                className="sm:flex-1"
                onClick={onCancel}
                disabled={isDeleting}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="button"
                variant="primary"
                className="sm:flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </span>
                )}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteDialog;
