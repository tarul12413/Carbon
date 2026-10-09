import { formatClock } from "@/domain/hours";
import { longDay, shortDay } from "@/domain/time";

/** "Fri 16, 7 PM". */
export const whenShort = (date: string, time: string) => `${shortDay(date)}, ${formatClock(time)}`;

/** "Friday 16 October, 7 PM". */
export const whenLong = (date: string, time: string) => `${longDay(date)}, ${formatClock(time)}`;
