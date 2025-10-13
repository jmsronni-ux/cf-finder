import { useState, useEffect, useCallback, useRef } from 'react';

interface PendingStatusState {
  [nodeId: string]: {
    isPending: boolean;
    timeRemaining: number;
  };
}

export const usePendingStatus = (nodes: any[], onNodeAppear?: (nodeId: string) => void) => {
  const [pendingStatus, setPendingStatus] = useState<PendingStatusState>({});
  const intervalsRef = useRef<{ [nodeId: string]: NodeJS.Timeout }>({});

  // Initialize pending status when a node appears
  const initializePendingStatus = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'fingerprintNode') return;

    // Clear any existing interval for this node
    if (intervalsRef.current[nodeId]) {
      clearInterval(intervalsRef.current[nodeId]);
      delete intervalsRef.current[nodeId];
    }

    const pendingSeconds = node.data?.pending || 0;
    
    if (pendingSeconds > 0) {
      setPendingStatus(prev => ({
        ...prev,
        [nodeId]: {
          isPending: true,
          timeRemaining: pendingSeconds
        }
      }));

      // Start countdown timer
      let timeLeft = pendingSeconds;
      const interval = setInterval(() => {
        timeLeft -= 1;
        
        if (timeLeft <= 0) {
          clearInterval(interval);
          delete intervalsRef.current[nodeId];
          setPendingStatus(prev => ({
            ...prev,
            [nodeId]: {
              isPending: false,
              timeRemaining: 0
            }
          }));
        } else {
          setPendingStatus(prev => ({
            ...prev,
            [nodeId]: {
              isPending: true,
              timeRemaining: timeLeft
            }
          }));
        }
      }, 1000);

      // Store interval reference
      intervalsRef.current[nodeId] = interval;
    } else {
      // No pending time, set as not pending immediately
      setPendingStatus(prev => ({
        ...prev,
        [nodeId]: {
          isPending: false,
          timeRemaining: 0
        }
      }));
    }
  }, [nodes]);

  // Get the effective status for a node (Pending or actual status)
  const getEffectiveStatus = useCallback((nodeId: string, actualStatus: string): string => {
    const status = pendingStatus[nodeId];
    if (status && status.isPending) {
      return 'Pending';
    }
    return actualStatus;
  }, [pendingStatus]);

  // Get time remaining for a node
  const getTimeRemaining = useCallback((nodeId: string): number => {
    return pendingStatus[nodeId]?.timeRemaining || 0;
  }, [pendingStatus]);

  // Check if a node is pending
  const isNodePending = useCallback((nodeId: string): boolean => {
    return pendingStatus[nodeId]?.isPending || false;
  }, [pendingStatus]);

  // Reset all pending statuses
  const resetPendingStatus = useCallback(() => {
    // Clear all active intervals
    Object.keys(intervalsRef.current).forEach(nodeId => {
      if (intervalsRef.current[nodeId]) {
        clearInterval(intervalsRef.current[nodeId]);
      }
    });
    intervalsRef.current = {};
    setPendingStatus({});
  }, []);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      Object.keys(intervalsRef.current).forEach(nodeId => {
        if (intervalsRef.current[nodeId]) {
          clearInterval(intervalsRef.current[nodeId]);
        }
      });
    };
  }, []);

  return {
    initializePendingStatus,
    getEffectiveStatus,
    getTimeRemaining,
    isNodePending,
    resetPendingStatus,
    pendingStatus
  };
};
