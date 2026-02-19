"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export interface DataFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  retryCount: number;
}

export interface DataFetchOptions {
  refreshInterval?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
  enableAutoRefresh?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: DataFetchOptions = {}
) {
  const {
    refreshInterval = 30000, // 30 seconds default
    retryAttempts = 3,
    retryDelay = 1000,
    enableAutoRefresh = true,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<DataFetchState<T>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    retryCount: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      loading: !isRetry, // Don't show loading on retry attempts
      error: isRetry ? prev.error : null
    }));

    try {
      const result = await fetchFn();

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        retryCount: 0
      }));

      onSuccess?.(result);
    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState(prev => {
        const newRetryCount = prev.retryCount + 1;
        const shouldRetry = newRetryCount < retryAttempts;

        if (shouldRetry) {
          // Schedule retry
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(true);
          }, retryDelay * Math.pow(2, newRetryCount - 1)); // Exponential backoff
        }

        return {
          ...prev,
          loading: false,
          error: errorMessage,
          retryCount: newRetryCount
        };
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [fetchFn, retryAttempts, retryDelay, onError, onSuccess]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      retryCount: 0
    }));
  }, []);

  // Initial fetch and dependency changes
  useEffect(() => {
    fetchData();
  }, dependencies);

  // Auto-refresh setup
  useEffect(() => {
    if (enableAutoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enableAutoRefresh, refreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    clearError,
    isRetrying: state.retryCount > 0 && state.retryCount < retryAttempts
  };
}



// Error boundary hook for better error handling
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    console.error('Error captured:', error);
    setError(error);
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      captureError(new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(new Error(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [captureError]);

  return {
    error,
    resetError,
    captureError
  };
}

// Utility hook for optimistic updates
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T, optimisticUpdate: Partial<T>) => T
) {
  const [data, setData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const updateOptimistically = useCallback((optimisticUpdate: Partial<T>) => {
    setData(prev => updateFn(prev, optimisticUpdate));
    setIsOptimistic(true);
  }, [updateFn]);

  const confirmUpdate = useCallback((confirmedData: T) => {
    setData(confirmedData);
    setIsOptimistic(false);
  }, []);

  const revertUpdate = useCallback(() => {
    setData(initialData);
    setIsOptimistic(false);
  }, [initialData]);

  return {
    data,
    isOptimistic,
    updateOptimistically,
    confirmUpdate,
    revertUpdate
  };
}

