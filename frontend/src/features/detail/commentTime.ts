import { formatDateLabel, toIsoDate } from '@/lib/dates'

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

/** "Today, 14:05", "Yesterday, 09:12" or "20 Oct, 18:30", in the viewer's time zone. */
export function formatCommentTime(createdAt: string, now: Date = new Date()): string {
  const posted = new Date(createdAt)
  return `${formatDateLabel(toIsoDate(posted), now)}, ${timeFormat.format(posted)}`
}
