import type {
  Attachment,
  AttachmentKind,
  AttachmentWithUrl,
  Comment,
  Designer,
  RequestDetail,
  RequestInput,
  RequestPatch,
  RequestRecord,
  WorkType,
} from "@/lib/types";

export type NewAttachment = {
  request_id: string;
  kind: AttachmentKind;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  bytes: ArrayBuffer;
};

/**
 * The portal talks to storage only through this interface. `supabase` is the
 * real, shared, persistent backend; `demo` is an in-memory stand-in seeded with
 * sample data so the app is fully clickable before any project is provisioned.
 */
export interface PortalRepo {
  readonly mode: "supabase" | "demo";

  listRequests(): Promise<RequestRecord[]>;
  getRequest(id: string): Promise<RequestDetail | null>;
  createRequest(input: RequestInput): Promise<string>;
  updateRequest(id: string, patch: RequestPatch): Promise<void>;
  deleteRequest(id: string): Promise<void>;

  addComment(requestId: string, author: string, body: string): Promise<void>;
  deleteComment(id: string): Promise<void>;

  addAttachment(input: NewAttachment): Promise<void>;
  deleteAttachment(id: string): Promise<void>;
  /** Resolves short-lived download links for a request's files. */
  resolveAttachmentUrls(attachments: Attachment[]): Promise<AttachmentWithUrl[]>;

  listDesigners(): Promise<Designer[]>;
  createDesigner(name: string, email: string | null): Promise<void>;
  updateDesigner(id: string, patch: Partial<Pick<Designer, "name" | "email" | "is_active">>): Promise<void>;

  listWorkTypes(): Promise<WorkType[]>;
  createWorkType(name: string): Promise<void>;
  updateWorkType(id: string, patch: Partial<Pick<WorkType, "name" | "is_active">>): Promise<void>;
}

export type { Comment, Designer, WorkType };
