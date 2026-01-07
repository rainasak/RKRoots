import api from './api';
import { TimelineEvent } from '../types';

export const timelineService = {
  async getEvents(treeId: string) {
    const response = await api.get<TimelineEvent[]>(`/trees/${treeId}/events`);
    return response.data;
  },

  async createEvent(treeId: string, data: Partial<TimelineEvent> & { participantIds: string[] }) {
    const response = await api.post<TimelineEvent>(`/trees/${treeId}/events`, data);
    return response.data;
  },

  async updateEvent(treeId: string, eventId: string, data: Partial<TimelineEvent>) {
    const response = await api.put<TimelineEvent>(`/events/${eventId}`, data);
    return response.data;
  },

  async deleteEvent(treeId: string, eventId: string) {
    await api.delete(`/events/${eventId}`);
  },
};
