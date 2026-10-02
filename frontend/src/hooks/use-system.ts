import useSWR from 'swr'
import { getCurrentUser, getDashboardStats, getSettings, getSystemStatus } from '@/services/system-service'
import { swrKeys } from '@/lib/swr-keys'

export function useDashboardStats() {
  return useSWR(swrKeys.stats, getDashboardStats)
}

export function useSystemStatus() {
  return useSWR(swrKeys.systemStatus, getSystemStatus)
}

export function useCurrentUser() {
  return useSWR(swrKeys.currentUser, getCurrentUser)
}

export function useSettings() {
  return useSWR(swrKeys.settings, getSettings)
}
