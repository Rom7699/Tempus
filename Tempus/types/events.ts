export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    date: string; // ISO format date 'YYYY-MM-DD'
    startTime: string; // 24h format 'HH:MM'
    endTime: string; // 24h format 'HH:MM'
    energyLevel: 1 | 2 | 3 | 4 | 5; // Energy level from 1 to 5
    color?: string; // Optional color for the event
  }
  
  export interface EventsState {
    events: Record<string, CalendarEvent[]>; // Indexed by date for quick lookup
    isLoading: boolean;
    error: string | null;
  }
  
  export interface MarkedDates {
    [date: string]: {
      marked: boolean;
      dotColor?: string;
      dots?: Array<{key: string; color: string}>;
    };
  }
  
  export type CalendarViewType = 'month' | 'week' | 'day';