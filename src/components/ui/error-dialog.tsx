"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  suggestions?: string[];
}

export function ErrorDialog({
  open,
  onClose,
  title = "We couldn't understand your request",
  message = "This is a beta version, and some complex searches might be too advanced at the moment. Try simplifying your request!",
  suggestions = []
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-4 text-base">
            {message}
          </DialogDescription>
        </DialogHeader>
        
        {suggestions.length > 0 && (
          <div className="py-4">
            <p className="mb-3 text-sm font-medium text-gray-700">
              Try something like:
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-lg bg-gray-50 p-3"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Our AI works best with clear destination names and timeframes. 
            Include your starting city and how many days you want to travel!
          </p>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it, I'll try again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}