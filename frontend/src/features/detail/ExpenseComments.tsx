import { useState, type FormEvent, type RefObject } from 'react'
import { SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import { type useComments, usePostComment } from '@/api/comments'
import { LoadError } from '@/components/LoadError'
import { PersonAvatar } from '@/components/PersonAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { nameForViewer } from '@/lib/person'
import { formatCommentTime } from './commentTime'

const maxCommentLength = 1000

type CommentListProps = {
  commentsQuery: ReturnType<typeof useComments>
  viewerId: number
  /** Marks the end of the list, so a new comment can be scrolled into view. */
  endRef: RefObject<HTMLDivElement | null>
}

export function CommentList({ commentsQuery, viewerId, endRef }: CommentListProps) {
  const { t } = useLingui()
  const comments = commentsQuery.data

  return (
    <section aria-labelledby="comments-heading" className="mt-5">
      <h3 id="comments-heading" className="mx-4 mb-1 text-sm font-medium text-muted-foreground">
        <Trans>Comments</Trans>
      </h3>
      {comments ? (
        comments.length === 0 ? (
          <p className="mx-4 py-2 text-[15px] text-muted-foreground">
            <Trans>No comments yet.</Trans>
          </p>
        ) : (
          <ul>
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3 px-4 py-2">
                <PersonAvatar
                  id={comment.author.id}
                  name={comment.author.displayName}
                  className="size-8 text-[13px]"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-semibold">
                      {nameForViewer(comment.author, viewerId)}
                    </span>
                    <span className="shrink-0 text-[13px] text-muted-foreground">
                      {formatCommentTime(comment.createdAt)}
                    </span>
                  </p>
                  <p className="text-[15px] leading-[1.45] break-words whitespace-pre-line">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : commentsQuery.isError ? (
        <LoadError
          compact
          title={t`Couldn’t load comments`}
          onRetry={() => commentsQuery.refetch()}
          isRetrying={commentsQuery.isFetching}
        />
      ) : (
        <p className="mx-4 py-2 text-[15px] text-muted-foreground">
          <Trans>Loading comments…</Trans>
        </p>
      )}
      <div ref={endRef} />
    </section>
  )
}

type CommentComposerProps = {
  expenseId: number
  onSent: () => void
}

export function CommentComposer({ expenseId, onSent }: CommentComposerProps) {
  const { t } = useLingui()
  const [body, setBody] = useState('')
  const postComment = usePostComment(expenseId)
  const trimmed = body.trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (trimmed === '' || postComment.isPending) {
      return
    }
    postComment.mutate(
      { body: trimmed },
      {
        onSuccess: () => {
          setBody((current) => (current.trim() === trimmed ? '' : current))
          onSent()
        },
        onError: () => toast.error(t`Couldn’t send the comment. Try again.`),
      },
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-t border-border bg-background px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      <Input
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t`Add a comment`}
        aria-label={t`Comment`}
        maxLength={maxCommentLength}
        enterKeyHint="send"
        className="flex-1 rounded-full px-4"
      />
      <Button
        type="submit"
        size="icon"
        aria-label={t`Send comment`}
        disabled={trimmed === '' || postComment.isPending}
        className="[&_svg]:size-5"
      >
        <SendHorizontal aria-hidden="true" />
      </Button>
    </form>
  )
}
