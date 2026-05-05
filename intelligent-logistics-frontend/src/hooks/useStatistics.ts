/**
 * React Query hooks for statistics data.
 * Centralizes all dashboard data fetching with proper loading/error states.
 */
import { useQuery } from '@tanstack/react-query';
import {
    getDashboardSummary,
    getVolumeData,
    getAlertsBreakdown,
    getTransportStats,
    getDecisionAnalytics,
    type DashboardSummary,
    type VolumeDataPoint,
    type AlertsBreakdown,
    type TransportStats,
    type DecisionAnalytics,
} from '@/services/statistics';
import { getActiveAlerts } from '@/services/alerts';
import type { Alert } from '@/types/types';

export function useSummaryStats(date?: string) {
    return useQuery<DashboardSummary>({
        queryKey: ['statistics', 'summary', date],
        queryFn: () => getDashboardSummary(date),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useVolumeData(
    from?: string,
    to?: string,
    interval: 'hour' | 'day' | 'week' = 'hour'
) {
    return useQuery<VolumeDataPoint[]>({
        queryKey: ['statistics', 'volume', from, to, interval],
        queryFn: () => getVolumeData(from, to, interval),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useAlertsBreakdown(from?: string, to?: string) {
    return useQuery<AlertsBreakdown[]>({
        queryKey: ['statistics', 'alerts-breakdown', from, to],
        queryFn: () => getAlertsBreakdown(from, to),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useTransportStats(from?: string, to?: string) {
    return useQuery<TransportStats[]>({
        queryKey: ['statistics', 'transport', from, to],
        queryFn: () => getTransportStats(from, to),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}

export function useDecisionAnalytics(date?: string) {
    return useQuery<DecisionAnalytics>({
        queryKey: ['statistics', 'decision-analytics', date],
        queryFn: () => getDecisionAnalytics(date),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}

export function useActiveAlerts(limit: number = 5) {
    return useQuery<Alert[]>({
        queryKey: ['alerts', 'active', limit],
        queryFn: () => getActiveAlerts(limit),
        refetchInterval: 15_000,
        staleTime: 10_000,
    });
}
