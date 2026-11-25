import { t } from '@lingui/core/macro'
import { formatDateLabel, formatTime, toIsoDate } from '@/lib/dates'

/** "Today, 14:05", "Yesterday, 09:12" or "20 Oct, 18:30", in the viewer's time zone. */
export function formatCommentTime(createdAt: string, now: Date = new Date()): string {
  const posted = new Date(createdAt)
  const day = formatDateLabel(toIsoDate(posted), now)
  const time = formatTime(posted)
  return t`${day}, ${time}`
}
