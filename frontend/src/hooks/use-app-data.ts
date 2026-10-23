import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings.service';

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: settingsService.public,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: settingsService.health,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
