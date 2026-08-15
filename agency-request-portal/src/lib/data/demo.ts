import { addDays, format } from "date-fns";
import { todayISO } from "@/lib/logic";
import type {
  Attachment,
  AttachmentWithUrl,
  Comment,
  Designer,
  RequestDetail,
  RequestInput,
  RequestPatch,
  RequestRecord,
  WorkType,
} from "@/lib/types";
import type { NewAttachment, PortalRepo } from "./repo";

/**
 * In-memory backend used when Supabase credentials are absent. It exists so the
 * portal can be demonstrated end-to-end — including creating, editing and
 * commenting — without provisioning anything. Data lives for the lifetime of
 * the server process only.
 */

type StoredRequest = {
  id: string;
  reference: string;
  title: string;
  brief: string | null;
  work_type_id: string | null;
  priority: RequestRecord["priority"];
  date_submitted: string;
  deadline: string | null;
  designer_id: string | null;
  status: RequestRecord["status"];
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

type StoredAttachment = Attachment & { data_url: string | null };

type DemoStore = {
  requests: StoredRequest[];
  comments: Comment[];
  attachments: StoredAttachment[];
  designers: Designer[];
  workTypes: WorkType[];
  counter: number;
};

/** Attachments are held as data URLs; cap them so the demo cannot eat memory. */
const DEMO_UPLOAD_LIMIT_BYTES = 1024 * 1024;

function iso(daysFromToday: number): string {
  return format(addDays(new Date(), daysFromToday), "yyyy-MM-dd");
}

function stamp(daysFromToday: number): string {
  return addDays(new Date(), daysFromToday).toISOString();
}

function seed(): DemoStore {
  const designers: Designer[] = [
    { id: "d-1", name: "Layla Hassan", email: "layla@agency.example", is_active: true },
    { id: "d-2", name: "Omar Al-Najjar", email: "omar@agency.example", is_active: true },
    { id: "d-3", name: "Mariam Saleh", email: "mariam@agency.example", is_active: true },
    { id: "d-4", name: "Yousef Darwish", email: "yousef@agency.example", is_active: true },
  ];

  const workTypes: WorkType[] = [
    { id: "w-1", name: "Image", sort_order: 1, is_active: true },
    { id: "w-2", name: "Breakdown", sort_order: 2, is_active: true },
    { id: "w-3", name: "Animation", sort_order: 3, is_active: true },
  ];

  const rows: Array<Omit<StoredRequest, "reference" | "created_at" | "updated_at">> = [
    {
      id: "r-1",
      title: "Eid Al-Adha campaign key visual",
      brief:
        "Master key visual for the Eid Al-Adha campaign, to be adapted across billboard, press and social. Arabic and English lockups, brand green palette, no stock imagery of people.",
      work_type_id: "w-1",
      priority: "High",
      date_submitted: iso(-14),
      deadline: iso(-3),
      designer_id: "d-1",
      status: "In Progress",
      delivered_at: null,
    },
    {
      id: "r-2",
      title: "Q2 results infographic",
      brief:
        "Single-page infographic summarising Q2 financial results for LinkedIn and the investor relations page. Figures will be supplied by Finance on approval.",
      work_type_id: "w-2",
      priority: "High",
      date_submitted: iso(-11),
      deadline: iso(-1),
      designer_id: "d-2",
      status: "New",
      delivered_at: null,
    },
    {
      id: "r-3",
      title: "Savings account promo — motion teaser",
      brief:
        "15-second vertical animation for Instagram and Snapchat promoting the new savings account profit rate. Needs an Arabic voiceover slot and end-frame with the app store badges.",
      work_type_id: "w-3",
      priority: "High",
      date_submitted: iso(-6),
      deadline: iso(1),
      designer_id: "d-1",
      status: "In Progress",
      delivered_at: null,
    },
    {
      id: "r-4",
      title: "Auto finance product breakdown",
      brief:
        "Explainer breakdown of the auto finance product: eligibility, profit rate, tenure and required documents. Customers keep asking branch staff the same four questions — this should answer them in one image.",
      work_type_id: "w-2",
      priority: "Medium",
      date_submitted: iso(-8),
      deadline: iso(2),
      designer_id: "d-3",
      status: "In Progress",
      delivered_at: null,
    },
    {
      id: "r-5",
      title: "Branch opening announcement — Salmiya",
      brief:
        "Announcement post for the new Salmiya branch. Include the address line, opening date and working hours. Square and story sizes.",
      work_type_id: "w-1",
      priority: "High",
      date_submitted: iso(-12),
      deadline: iso(-4),
      designer_id: "d-4",
      status: "Delivered",
      delivered_at: iso(-5),
    },
    {
      id: "r-6",
      title: "Credit card benefits explainer",
      brief:
        "Breakdown of the rewards programme tiers for the premium credit card. Cashback, airport lounge access and travel insurance.",
      work_type_id: "w-2",
      priority: "Low",
      date_submitted: iso(-5),
      deadline: iso(9),
      designer_id: "d-2",
      status: "New",
      delivered_at: null,
    },
    {
      id: "r-7",
      title: "ATM screen artwork refresh",
      brief:
        "Refresh the idle-screen artwork across the ATM network. Six screens, 1280x1024, must stay legible at low brightness.",
      work_type_id: "w-1",
      priority: "Low",
      date_submitted: iso(-3),
      deadline: iso(14),
      designer_id: null,
      status: "New",
      delivered_at: null,
    },
    {
      id: "r-8",
      title: "Youth account campaign — social kit",
      brief:
        "Full social kit for the youth account launch: 4 static posts, 2 stories, 1 cover. Younger tone than the main brand line but still inside brand guidelines.",
      work_type_id: "w-1",
      priority: "Medium",
      date_submitted: iso(-9),
      deadline: iso(0),
      designer_id: "d-3",
      status: "In Progress",
      delivered_at: null,
    },
    {
      id: "r-9",
      title: "Sustainability report — website hero",
      brief:
        "Hero banner for the annual sustainability report landing page. Desktop, tablet and mobile crops.",
      work_type_id: "w-1",
      priority: "Medium",
      date_submitted: iso(-20),
      deadline: iso(-9),
      designer_id: "d-4",
      status: "Delivered",
      delivered_at: iso(-10),
    },
    {
      id: "r-10",
      title: "Mobile app update — feature walkthrough animation",
      brief:
        "Short animation walking customers through the redesigned transfers flow in the mobile app. Screens will be supplied as a Figma link.",
      work_type_id: "w-3",
      priority: "Medium",
      date_submitted: iso(-2),
      deadline: iso(7),
      designer_id: "d-1",
      status: "New",
      delivered_at: null,
    },
    {
      id: "r-11",
      title: "Ramadan working hours notice",
      brief: "Simple bilingual notice for branch working hours during Ramadan. Social and in-branch screens.",
      work_type_id: "w-1",
      priority: "Medium",
      date_submitted: iso(-4),
      deadline: iso(-1),
      designer_id: "d-2",
      status: "In Progress",
      delivered_at: null,
    },
    {
      id: "r-12",
      title: "Home finance calculator — explainer breakdown",
      brief:
        "Breakdown showing how the home finance calculator works, step by step, for the campaign landing page.",
      work_type_id: "w-2",
      priority: "Medium",
      date_submitted: iso(-16),
      deadline: iso(-6),
      designer_id: "d-3",
      status: "Delivered",
      delivered_at: iso(-6),
    },
  ];

  const requests: StoredRequest[] = rows.map((row, index) => ({
    ...row,
    reference: `REQ-${String(index + 1).padStart(4, "0")}`,
    created_at: stamp(-30 + index),
    updated_at: stamp(-1),
  }));

  const comments: Comment[] = [
    {
      id: "c-1",
      request_id: "r-1",
      author: "Account Manager",
      body: "Sent the brand book and last year's Eid artwork as reference. Please keep the crescent treatment consistent with 2025.",
      created_at: stamp(-13),
    },
    {
      id: "c-2",
      request_id: "r-1",
      author: "Layla Hassan",
      body: "First round is with our art director for review. Expect it by tomorrow.",
      created_at: stamp(-4),
    },
    {
      id: "c-3",
      request_id: "r-1",
      author: "Account Manager",
      body: "This is now past the agreed deadline — please confirm a new delivery date today.",
      created_at: stamp(-1),
    },
    {
      id: "c-4",
      request_id: "r-3",
      author: "Account Manager",
      body: "Compliance approved the profit rate figure, you can lock the end frame.",
      created_at: stamp(-2),
    },
    {
      id: "c-5",
      request_id: "r-5",
      author: "Yousef Darwish",
      body: "Delivered both sizes plus a layered source file.",
      created_at: stamp(-5),
    },
  ];

  const attachments: StoredAttachment[] = [
    {
      id: "a-1",
      request_id: "r-1",
      kind: "reference",
      file_name: "eid-2025-reference.pdf",
      mime_type: "application/pdf",
      size_bytes: 2_412_000,
      storage_path: "demo/eid-2025-reference.pdf",
      created_at: stamp(-13),
      data_url: null,
    },
    {
      id: "a-2",
      request_id: "r-5",
      kind: "deliverable",
      file_name: "salmiya-opening-square.png",
      mime_type: "image/png",
      size_bytes: 840_000,
      storage_path: "demo/salmiya-opening-square.png",
      created_at: stamp(-5),
      data_url: null,
    },
  ];

  return { requests, comments, attachments, designers, workTypes, counter: requests.length };
}

// Survives dev-server hot reloads so demo edits are not lost on every save.
const globalRef = globalThis as unknown as { __portalDemoStore?: DemoStore };
function store(): DemoStore {
  if (!globalRef.__portalDemoStore) globalRef.__portalDemoStore = seed();
  return globalRef.__portalDemoStore;
}

function toRecord(row: StoredRequest, db: DemoStore): RequestRecord {
  const designer = db.designers.find((d) => d.id === row.designer_id) ?? null;
  const workType = db.workTypes.find((w) => w.id === row.work_type_id) ?? null;
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    brief: row.brief,
    work_type: workType ? { id: workType.id, name: workType.name } : null,
    priority: row.priority,
    date_submitted: row.date_submitted,
    deadline: row.deadline,
    designer: designer ? { id: designer.id, name: designer.name } : null,
    status: row.status,
    delivered_at: row.delivered_at,
    comment_count: db.comments.filter((c) => c.request_id === row.id).length,
    attachment_count: db.attachments.filter((a) => a.request_id === row.id).length,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Mirrors the database trigger: `delivered_at` is stamped the moment a request
 * becomes Delivered and cleared if it is ever moved back to an open status.
 */
function syncDeliveredAt(row: StoredRequest) {
  if (row.status === "Delivered") {
    if (!row.delivered_at) row.delivered_at = todayISO();
  } else {
    row.delivered_at = null;
  }
}

export const demoRepo: PortalRepo = {
  mode: "demo",

  async listRequests() {
    const db = store();
    return db.requests.map((row) => toRecord(row, db));
  },

  async getRequest(id) {
    const db = store();
    const row = db.requests.find((r) => r.id === id);
    if (!row) return null;
    const detail: RequestDetail = {
      ...toRecord(row, db),
      comments: db.comments
        .filter((c) => c.request_id === id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      attachments: db.attachments
        .filter((a) => a.request_id === id)
        .map(({ data_url: _data, ...rest }) => rest)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
    return detail;
  },

  async createRequest(input) {
    const db = store();
    db.counter += 1;
    const now = new Date().toISOString();
    const row: StoredRequest = {
      id: crypto.randomUUID(),
      reference: `REQ-${String(db.counter).padStart(4, "0")}`,
      ...input,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    };
    syncDeliveredAt(row);
    db.requests.push(row);
    return row.id;
  },

  async updateRequest(id, patch) {
    const db = store();
    const row = db.requests.find((r) => r.id === id);
    if (!row) throw new Error("Request not found");
    Object.assign(row, patch);
    row.updated_at = new Date().toISOString();
    syncDeliveredAt(row);
  },

  async deleteRequest(id) {
    const db = store();
    db.requests = db.requests.filter((r) => r.id !== id);
    db.comments = db.comments.filter((c) => c.request_id !== id);
    db.attachments = db.attachments.filter((a) => a.request_id !== id);
  },

  async addComment(requestId, author, body) {
    const db = store();
    db.comments.push({
      id: crypto.randomUUID(),
      request_id: requestId,
      author,
      body,
      created_at: new Date().toISOString(),
    });
  },

  async deleteComment(id) {
    const db = store();
    db.comments = db.comments.filter((c) => c.id !== id);
  },

  async addAttachment(input) {
    const db = store();
    if (input.size_bytes > DEMO_UPLOAD_LIMIT_BYTES) {
      throw new Error(
        "Demo mode holds uploads in memory and caps them at 1 MB. Connect Supabase for full-size attachments.",
      );
    }
    const base64 = Buffer.from(input.bytes).toString("base64");
    db.attachments.push({
      id: crypto.randomUUID(),
      request_id: input.request_id,
      kind: input.kind,
      file_name: input.file_name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_path: `demo/${input.file_name}`,
      created_at: new Date().toISOString(),
      data_url: `data:${input.mime_type ?? "application/octet-stream"};base64,${base64}`,
    });
  },

  async deleteAttachment(id) {
    const db = store();
    db.attachments = db.attachments.filter((a) => a.id !== id);
  },

  async resolveAttachmentUrls(attachments) {
    const db = store();
    return attachments.map((attachment): AttachmentWithUrl => {
      const stored = db.attachments.find((a) => a.id === attachment.id);
      return { ...attachment, url: stored?.data_url ?? null };
    });
  },

  async listDesigners() {
    return [...store().designers].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createDesigner(name, email) {
    const db = store();
    // Mirrors the unique indexes in 0001_schema.sql so both backends reject
    // duplicates the same way.
    if (db.designers.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`${name} is already on the designer list.`);
    }
    db.designers.push({ id: crypto.randomUUID(), name, email, is_active: true });
  },

  async updateDesigner(id, patch) {
    const designer = store().designers.find((d) => d.id === id);
    if (designer) Object.assign(designer, patch);
  },

  async listWorkTypes() {
    return [...store().workTypes].sort((a, b) => a.sort_order - b.sort_order);
  },

  async createWorkType(name) {
    const db = store();
    if (db.workTypes.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`"${name}" is already a work type.`);
    }
    const nextOrder = Math.max(0, ...db.workTypes.map((w) => w.sort_order)) + 1;
    db.workTypes.push({ id: crypto.randomUUID(), name, sort_order: nextOrder, is_active: true });
  },

  async updateWorkType(id, patch) {
    const workType = store().workTypes.find((w) => w.id === id);
    if (workType) Object.assign(workType, patch);
  },
};
