"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { IDLE } from "@/lib/action-state";
import { addCommentAction, deleteCommentAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/logic";
import type { Comment } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function CommentThread({
  requestId,
  comments,
}: {
  requestId: string;
  comments: Comment[];
}) {
  const [state, formAction] = useActionState(addCommentAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const commentCount = comments.length;

  // Clear the box once a post lands (the list grows on the server round trip).
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [commentCount, state.error]);

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No comments yet. Use this thread to keep the back-and-forth with the agency in one place.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                {initials(comment.author)}
              </span>
              <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{comment.author}</p>
                  <div className="flex items-center gap-2">
                    <time className="text-xs text-slate-500">
                      {formatDateTime(comment.created_at)}
                    </time>
                    <form action={deleteCommentAction}>
                      <input type="hidden" name="id" value={comment.id} />
                      <input type="hidden" name="request_id" value={requestId} />
                      <button
                        type="submit"
                        className="text-xs text-slate-400 transition hover:text-red-600"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-2 border-t border-slate-200 pt-4">
        <FormError message={state.error} />
        <Textarea
          name="body"
          rows={3}
          placeholder="Add a note — a change request, an approval, a chase…"
          aria-label="New comment"
          maxLength={4000}
          required
        />
        <input type="hidden" name="request_id" value={requestId} />
        <div className="flex justify-end">
          <SubmitButton size="sm" pendingLabel="Posting…">
            Post comment
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
