"use client";

import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteDialogProps {
  docName: string;
  numChunks: number;
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDialog({
  docName,
  numChunks,
  isOpen,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm bg-slate-800 text-slate-100 ring-slate-700">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <DialogTitle className="text-center text-white">
            Delete Document
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            Delete <span className="font-medium text-slate-200">{docName}</span>?
            This will remove all{" "}
            <span className="font-medium text-slate-200">{numChunks}</span>{" "}
            chunk{numChunks !== 1 ? "s" : ""} and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent border-0 flex-row justify-center gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
