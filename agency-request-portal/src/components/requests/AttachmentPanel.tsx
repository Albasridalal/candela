"use client";

import { useActionState, useRef } from "react";
import { Download, FileText, Paperclip } from "lucide-react";
import { SubmitButton } from "@/components/ui/Button";
import { FormError, Select } from "@/components/ui/Field";
import { IDLE } from "@/lib/action-state";
import { deleteAttachmentAction, uploadAttachmentAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/logic";
import type { AttachmentWithUrl } from "@/lib/types";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({
  requestId,
  attachments,
}: {
  requestId: string;
  attachments: AttachmentWithUrl[];
}) {
  const [state, formAction] = useActionState(uploadAttachmentAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  const references = attachments.filter((a) => a.kind === "reference");
  const deliverables = attachments.filter((a) => a.kind === "deliverable");

  const group = (title: string, items: AttachmentWithUrl[], emptyText: string) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-slate-500">
                  {[formatSize(attachment.size_bytes), formatDateTime(attachment.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {attachment.url ? (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  download={attachment.file_name}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Open
                </a>
              ) : (
                <span
                  className="text-xs text-slate-400"
                  title="Seeded demo record — no file was uploaded"
                >
                  Sample
                </span>
              )}
              <form action={deleteAttachmentAction}>
                <input type="hidden" name="id" value={attachment.id} />
                <input type="hidden" name="request_id" value={requestId} />
                <button
                  type="submit"
                  className="text-xs text-slate-400 transition hover:text-red-600"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {group("Reference files in", references, "No reference files shared with the agency yet.")}
      {group("Final deliverables out", deliverables, "Nothing delivered back yet.")}

      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="space-y-2 border-t border-slate-200 pt-4"
      >
        <FormError message={state.error} />
        <input type="hidden" name="request_id" value={requestId} />

        <div className="flex flex-wrap items-center gap-2">
          <Select name="kind" defaultValue="reference" aria-label="Attachment type" className="w-auto">
            <option value="reference">Reference file in</option>
            <option value="deliverable">Final deliverable out</option>
          </Select>

          <label className="inline-flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:border-brand-400 hover:text-slate-800">
            <Paperclip className="h-4 w-4" aria-hidden />
            <span>Choose a file</span>
            <input type="file" name="file" className="sr-only" required />
          </label>

          <SubmitButton size="sm" pendingLabel="Uploading…">
            Upload
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
