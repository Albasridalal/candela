import "server-only";

import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET } from "@/lib/supabase/config";
import type {
  Attachment,
  AttachmentWithUrl,
  Designer,
  RequestDetail,
  RequestRecord,
  WorkType,
} from "@/lib/types";
import type { PortalRepo } from "./repo";

const REQUEST_COLUMNS = `
  id,
  reference,
  title,
  brief,
  priority,
  date_submitted,
  deadline,
  status,
  delivered_at,
  created_at,
  updated_at,
  work_type:work_types ( id, name ),
  designer:designers ( id, name ),
  comment_count:request_comments ( count ),
  attachment_count:request_attachments ( count )
`;

/** Supabase returns embedded aggregates as `[{ count: n }]`. */
function readCount(value: unknown): number {
  if (Array.isArray(value)) return Number(value[0]?.count ?? 0);
  if (value && typeof value === "object" && "count" in value) {
    return Number((value as { count: unknown }).count ?? 0);
  }
  return 0;
}

/** An embedded to-one relation arrives as an object, or an array of one. */
function readRelation(value: unknown): { id: string; name: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const { id, name } = row as { id?: string; name?: string };
  return id && name ? { id, name } : null;
}

function toRecord(row: Record<string, unknown>): RequestRecord {
  return {
    id: String(row.id),
    reference: String(row.reference ?? ""),
    title: String(row.title ?? ""),
    brief: (row.brief as string | null) ?? null,
    work_type: readRelation(row.work_type),
    priority: row.priority as RequestRecord["priority"],
    date_submitted: String(row.date_submitted),
    deadline: (row.deadline as string | null) ?? null,
    designer: readRelation(row.designer),
    status: row.status as RequestRecord["status"],
    delivered_at: (row.delivered_at as string | null) ?? null,
    comment_count: readCount(row.comment_count),
    attachment_count: readCount(row.attachment_count),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export const supabaseRepo: PortalRepo = {
  mode: "supabase",

  async listRequests() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("requests")
      .select(REQUEST_COLUMNS)
      .order("created_at", { ascending: false });
    fail("Could not load requests", error);
    return (data ?? []).map((row) => toRecord(row as unknown as Record<string, unknown>));
  },

  async getRequest(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("requests")
      .select(REQUEST_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    fail("Could not load request", error);
    if (!data) return null;

    const [comments, attachments] = await Promise.all([
      supabase
        .from("request_comments")
        .select("id, request_id, author, body, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("request_attachments")
        .select("id, request_id, kind, file_name, mime_type, size_bytes, storage_path, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
    ]);
    fail("Could not load comments", comments.error);
    fail("Could not load attachments", attachments.error);

    const detail: RequestDetail = {
      ...toRecord(data as unknown as Record<string, unknown>),
      comments: (comments.data ?? []) as RequestDetail["comments"],
      attachments: (attachments.data ?? []) as Attachment[],
    };
    return detail;
  },

  async createRequest(input) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("requests").insert(input).select("id").single();
    fail("Could not create request", error);
    return String(data!.id);
  },

  async updateRequest(id, patch) {
    const supabase = await createClient();
    const { error } = await supabase.from("requests").update(patch).eq("id", id);
    fail("Could not update request", error);
  },

  async deleteRequest(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("requests").delete().eq("id", id);
    fail("Could not delete request", error);
  },

  async addComment(requestId, author, body) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("request_comments")
      .insert({ request_id: requestId, author, body });
    fail("Could not post comment", error);
  },

  async deleteComment(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("request_comments").delete().eq("id", id);
    fail("Could not delete comment", error);
  },

  async addAttachment(input) {
    const supabase = await createClient();
    const safeName = input.file_name.replace(/[^\w.\-]+/g, "_");
    const storagePath = `${input.request_id}/${crypto.randomUUID()}-${safeName}`;

    const upload = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, input.bytes, {
        contentType: input.mime_type ?? "application/octet-stream",
        upsert: false,
      });
    fail("Could not upload file", upload.error);

    const { error } = await supabase.from("request_attachments").insert({
      request_id: input.request_id,
      kind: input.kind,
      file_name: input.file_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_path: storagePath,
    });
    if (error) {
      // Do not leave an orphaned object behind if the row insert fails.
      await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
      fail("Could not save attachment", error);
    }
  },

  async deleteAttachment(id) {
    const supabase = await createClient();
    const { data, error: findError } = await supabase
      .from("request_attachments")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    fail("Could not find attachment", findError);

    const { error } = await supabase.from("request_attachments").delete().eq("id", id);
    fail("Could not delete attachment", error);

    if (data?.storage_path) {
      await supabase.storage.from(ATTACHMENTS_BUCKET).remove([String(data.storage_path)]);
    }
  },

  async resolveAttachmentUrls(attachments) {
    if (attachments.length === 0) return [];
    const supabase = await createClient();
    const paths = attachments.map((a) => a.storage_path);
    const { data } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrls(paths, 60 * 60);

    const urlByPath = new Map<string, string>();
    (data ?? []).forEach((entry) => {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    });

    return attachments.map(
      (attachment): AttachmentWithUrl => ({
        ...attachment,
        url: urlByPath.get(attachment.storage_path) ?? null,
      }),
    );
  },

  async listDesigners() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("designers")
      .select("id, name, email, is_active")
      .order("name", { ascending: true });
    fail("Could not load designers", error);
    return (data ?? []) as Designer[];
  },

  async createDesigner(name, email) {
    const supabase = await createClient();
    const { error } = await supabase.from("designers").insert({ name, email });
    fail("Could not add designer", error);
  },

  async updateDesigner(id, patch) {
    const supabase = await createClient();
    const { error } = await supabase.from("designers").update(patch).eq("id", id);
    fail("Could not update designer", error);
  },

  async listWorkTypes() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("work_types")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true });
    fail("Could not load work types", error);
    return (data ?? []) as WorkType[];
  },

  async createWorkType(name) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("work_types")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = Number(data?.sort_order ?? 0) + 1;

    const { error } = await supabase.from("work_types").insert({ name, sort_order: nextOrder });
    fail("Could not add work type", error);
  },

  async updateWorkType(id, patch) {
    const supabase = await createClient();
    const { error } = await supabase.from("work_types").update(patch).eq("id", id);
    fail("Could not update work type", error);
  },
};
