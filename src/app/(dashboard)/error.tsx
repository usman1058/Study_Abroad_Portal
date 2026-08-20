"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <RefreshCw className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          We encountered an unexpected error. Please try again or go back to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="primary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link href="/home">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="text-left text-sm text-slate-500 dark:text-slate-400 mt-4">
            <summary className="cursor-pointer mb-2">Error details (dev only)</summary>
            <pre className="whitespace-pre-wrap rounded bg-slate-100 p-4 dark:bg-slate-800">{error.message}</pre>
          </details>
        )}
      </div>
    </div>
  );
}