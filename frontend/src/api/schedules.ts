import { api } from './client'
import type { ScheduledRun } from '../types'

export const listSchedules = () => api.get<ScheduledRun[]>('/schedules').then((r) => r.data)
export const createSchedule = (schedule: ScheduledRun) =>
  api.post<ScheduledRun>('/schedules', schedule).then((r) => r.data)
export const updateSchedule = (id: number, schedule: ScheduledRun) =>
  api.put<ScheduledRun>(`/schedules/${id}`, schedule).then((r) => r.data)
export const deleteSchedule = (id: number) => api.delete(`/schedules/${id}`)
export const runScheduleNow = (id: number) =>
  api.post<ScheduledRun>(`/schedules/${id}/run`).then((r) => r.data)
