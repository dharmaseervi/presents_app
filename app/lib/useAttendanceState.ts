// lib/useAttendanceState.ts
import { useState, useCallback } from 'react';

export type AttendanceStatus = 'idle' | 'marking' | 'success' | 'error' | 'already_marked';

export const useAttendanceState = () => {
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const [markedAt, setMarkedAt] = useState('');

  const markSuccess = useCallback((time?: string) => {
    setStatus('success');
    setMarkedAt(time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  const markError = useCallback(() => {
    setStatus('error');
  }, []);

  const markAlreadyMarked = useCallback(() => {
    setStatus('already_marked');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setMarkedAt('');
  }, []);

  return {
    status,
    markedAt,
    markSuccess,
    markError,
    markAlreadyMarked,
    reset,
    isLoading: status === 'marking',
    isSuccess: status === 'success' || status === 'already_marked',
    isError: status === 'error',
  };
};