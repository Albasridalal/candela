export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["New", "In Progress", "Delivered"] as const;
export type Status = (typeof STATUSES)[number];

export const ATTACHMENT_KINDS = ["reference", "deliverable"] as const;
/** `reference` = files sent *to* the agency. `deliverable` = final files sent back. */
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export type Designer = {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
};

export type WorkType = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type Comment = {
  id: string;
  request_id: string;
  author: string;
  body: string;
  created_at: string;
};

export type Attachment = {
  id: string;
  request_id: string;
  kind: AttachmentKind;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

/** An attachment plus a resolved, temporary link the browser can open. */
export type AttachmentWithUrl = Attachment & { url: string | null };

/** Shape used by the dashboard and the requests table. */
export type RequestRecord = {
  id: string;
  reference: string;
  title: string;
  brief: string | null;
  work_type: { id: string; name: string } | null;
  priority: Priority;
  /** `YYYY-MM-DD` */
  date_submitted: string;
  /** `YYYY-MM-DD` or null when no deadline has been agreed yet. */
  deadline: string | null;
  designer: { id: string; name: string } | null;
  status: Status;
  delivered_at: string | null;
  comment_count: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
};

export type RequestDetail = RequestRecord & {
  comments: Comment[];
  attachments: Attachment[];
};

export type RequestInput = {
  title: string;
  brief: string | null;
  work_type_id: string | null;
  priority: Priority;
  date_submitted: string;
  deadline: string | null;
  designer_id: string | null;
  status: Status;
};

export type RequestPatch = Partial<RequestInput>;
