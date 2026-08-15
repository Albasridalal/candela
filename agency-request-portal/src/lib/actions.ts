"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { IDLE, type ActionState } from "./action-state";
import { getAuthorLabel } from "./auth";
import { getRepo } from "./data";
import { todayISO } from "./logic";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import { ATTACHMENT_KINDS, PRIORITIES, STATUSES } from "./types";

/** Turns thrown repository/storage errors into a message the form can render. */
function toState(error: unknown): ActionState {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  return { error: message };
}

function refresh(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/requests");
  revalidatePath("/settings");
  if (id) revalidatePath(`/requests/${id}`);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

/** `<select>` sends "" for the blank option; treat that as "not set". */
const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date")
  .transform((value) => (value === "" ? null : value))
  .nullable();

const requestSchema = z.object({
  title: z.string().trim().min(3, "Give the request a title of at least 3 characters").max(200),
  brief: optionalText(5000),
  work_type_id: optionalId,
  priority: z.enum(PRIORITIES),
  date_submitted: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid submission date"),
  deadline: optionalDate,
  designer_id: optionalId,
  status: z.enum(STATUSES),
});

function readRequestForm(formData: FormData) {
  return requestSchema.safeParse({
    title: formData.get("title") ?? "",
    brief: formData.get("brief") ?? "",
    work_type_id: formData.get("work_type_id") ?? "",
    priority: formData.get("priority") ?? "Medium",
    date_submitted: formData.get("date_submitted") ?? todayISO(),
    deadline: formData.get("deadline") ?? "",
    designer_id: formData.get("designer_id") ?? "",
    status: formData.get("status") ?? "New",
  });
}

export async function createRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = readRequestForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form." };
  }

  let id: string;
  try {
    id = await getRepo().createRequest(parsed.data);
  } catch (error) {
    return toState(error);
  }

  refresh(id);
  // redirect() signals by throwing, so it must sit outside the try block.
  redirect(`/requests/${id}`);
}

export async function updateRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing request id." };

  const parsed = readRequestForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form." };
  }

  try {
    await getRepo().updateRequest(id, parsed.data);
  } catch (error) {
    return toState(error);
  }

  refresh(id);
  return IDLE;
}

/** Used by the one-click status control on the detail page. */
export async function setStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = z.enum(STATUSES).safeParse(formData.get("status"));
  if (!id || !status.success) return;

  await getRepo().updateRequest(id, { status: status.data });
  refresh(id);
}

export async function deleteRequestAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getRepo().deleteRequest(id);
  refresh(id);
  redirect("/requests");
}

const commentSchema = z.object({
  request_id: z.string().min(1),
  body: z.string().trim().min(1, "Write a comment before posting").max(4000),
});

export async function addCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = commentSchema.safeParse({
    request_id: formData.get("request_id") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the comment." };
  }

  try {
    const author = await getAuthorLabel();
    await getRepo().addComment(parsed.data.request_id, author, parsed.data.body);
  } catch (error) {
    return toState(error);
  }

  refresh(parsed.data.request_id);
  return IDLE;
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  if (!id) return;

  await getRepo().deleteComment(id);
  refresh(requestId);
}

export async function uploadAttachmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestId = String(formData.get("request_id") ?? "");
  const kindResult = z.enum(ATTACHMENT_KINDS).safeParse(formData.get("kind"));
  const file = formData.get("file");

  if (!requestId || !kindResult.success) return { error: "Missing upload details." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };

  try {
    await getRepo().addAttachment({
      request_id: requestId,
      kind: kindResult.data,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      bytes: await file.arrayBuffer(),
    });
  } catch (error) {
    return toState(error);
  }

  refresh(requestId);
  return IDLE;
}

export async function deleteAttachmentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  if (!id) return;

  await getRepo().deleteAttachment(id);
  refresh(requestId);
}

const designerSchema = z.object({
  name: z.string().trim().min(2, "Enter the designer's name").max(120),
  email: optionalText(200),
});

export async function addDesignerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = designerSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form." };
  }

  try {
    await getRepo().createDesigner(parsed.data.name, parsed.data.email);
  } catch (error) {
    return toState(error);
  }

  refresh();
  return IDLE;
}

/** Designers are archived rather than deleted so past requests keep their name. */
export async function toggleDesignerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  await getRepo().updateDesigner(id, { is_active: !isActive });
  refresh();
}

export async function addWorkTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .string()
    .trim()
    .min(2, "Enter a work type name")
    .max(80)
    .safeParse(formData.get("name") ?? "");
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form." };
  }

  try {
    await getRepo().createWorkType(parsed.data);
  } catch (error) {
    return toState(error);
  }

  refresh();
  return IDLE;
}

export async function toggleWorkTypeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  await getRepo().updateWorkType(id, { is_active: !isActive });
  refresh();
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) redirect("/dashboard");

  const parsed = z
    .object({
      email: z.string().trim().email("Enter a valid email address"),
      password: z.string().min(1, "Enter your password"),
    })
    .safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
    });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check your details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
