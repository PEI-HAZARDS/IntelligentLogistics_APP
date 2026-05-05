/**
 * React Query hooks for arrivals data.
 */
import { useQuery } from '@tanstack/react-query';
import { getArrivals } from '@/services/arrivals';
import type { Appointment, PaginatedResponse } from '@/types/types';

export function useInfractionArrivals(page: number, limit: number, search?: string) {
    return useQuery<PaginatedResponse<Appointment>>({
        queryKey: ['arrivals', 'infractions', page, limit, search],
        queryFn: () => getArrivals({ highway_infraction: true, page, limit, search }),
        refetchInterval: 30_000,
        staleTime: 15_000,
    });
}
