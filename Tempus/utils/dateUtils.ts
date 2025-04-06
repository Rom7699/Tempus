import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay } from 'date-fns';
import { CalendarEvent, MarkedDates } from '../types/events';

/**
 * Get the current date in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Get array of dates for the current week
 */
export const getCurrentWeekDates = (): string[] => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
  const end = endOfWeek(now, { weekStartsOn: 1 }); // End on Sunday
  
  const weekDates = eachDayOfInterval({ start, end });
  return weekDates.map(date => format(date, 'yyyy-MM-dd'));
};

/**
 * Get array of dates for a specific week
 */
export const getWeekDates = (dateString: string): string[] => {
  const date = new Date(dateString);
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  const weekDates = eachDayOfInterval({ start, end });
  return weekDates.map(date => format(date, 'yyyy-MM-dd'));
};

/**
 * Get previous date
 */
export const getPreviousDate = (dateString: string): string => {
  const date = new Date(dateString);
  const previousDate = addDays(date, -1);
  return format(previousDate, 'yyyy-MM-dd');
};

/**
 * Get next date
 */
export const getNextDate = (dateString: string): string => {
  const date = new Date(dateString);
  const nextDate = addDays(date, 1);
  return format(nextDate, 'yyyy-MM-dd');
};

/**
 * Get day name from date string
 */
export const getDayName = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'EEEE'); // Monday, Tuesday, etc.
};

/**
 * Get short day name from date string
 */
export const getShortDayName = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'EEE'); // Mon, Tue, etc.
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'MMMM d, yyyy');
};

/**
 * Get time from date and time string
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
};

/**
 * Convert 12-hour format to 24-hour format
 */
export const convertTo24Hour = (time12h: string): string => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours.padStart(2, '0')}:${minutes}`;
};

/**
 * Create marked dates object for the calendar
 */
export const createMarkedDates = (events: Record<string, CalendarEvent[]>): MarkedDates => {
  const markedDates: MarkedDates = {};
  
  Object.keys(events).forEach(date => {
    if (events[date] && events[date].length > 0) {
      // If we have multiple events on the same day, show dots for each
      if (events[date].length > 1) {
        markedDates[date] = {
          marked: true,
          dots: events[date].map(event => ({
            key: event.id,
            color: getEnergyLevelColor(event.energyLevel)
          }))
        };
      } else {
        // Single event
        markedDates[date] = {
          marked: true,
          dotColor: getEnergyLevelColor(events[date][0].energyLevel)
        };
      }
    }
  });
  
  return markedDates;
};

/**
 * Get color based on energy level
 */
export const getEnergyLevelColor = (level: number): string => {
  switch (level) {
    case 1:
      return '#4CAF50'; // Green - Low energy
    case 2:
      return '#8BC34A'; // Light green
    case 3:
      return '#FFC107'; // Yellow
    case 4:
      return '#FF9800'; // Orange
    case 5:
      return '#F44336'; // Red - High energy
    default:
      return '#9E9E9E'; // Grey
  }
};

/**
 * Get text description for energy level
 */
export const getEnergyLevelText = (level: number): string => {
  switch (level) {
    case 1:
      return 'Very Low';
    case 2:
      return 'Low';
    case 3:
      return 'Medium';
    case 4:
      return 'High';
    case 5:
      return 'Very High';
    default:
      return 'Unknown';
  }
};

/**
 * Sort events by start time
 */
export const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
};

/**
 * Check if events overlap
 */
export const doEventsOverlap = (event1: CalendarEvent, event2: CalendarEvent): boolean => {
  // Events are on different days
  if (event1.date !== event2.date) {
    return false;
  }
  
  const start1 = event1.startTime;
  const end1 = event1.endTime;
  const start2 = event2.startTime;
  const end2 = event2.endTime;
  
  return (
    (start1 < end2 && start1 >= start2) ||
    (end1 > start2 && end1 <= end2) ||
    (start1 <= start2 && end1 >= end2)
  );
};