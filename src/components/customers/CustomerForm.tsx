"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { customerSchema, CustomerFormValues } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Customer } from "@/lib/types/database.types";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const { show } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: customer?.full_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      birthday: customer?.birthday ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const DUPLICATE_PHONE = "Another customer already has that phone number.";

  async function onSubmit(values: CustomerFormValues) {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      full_name: values.full_name,
      phone: values.phone,
      email: values.email || null,
      birthday: values.birthday || null,
      notes: values.notes || null,
    };

    if (customer) {
      const { error: updateError } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", customer.id);
      setIsSubmitting(false);
      if (updateError) {
        return setError(
          updateError.code === "23505" ? DUPLICATE_PHONE : "Couldn't update this customer."
        );
      }
      show("Customer updated");
      router.push(`/customers/${customer.id}`);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle();

      const { data: inserted, error: insertError } = await supabase
        .from("customers")
        .insert({ ...payload, business_id: profileRow?.business_id })
        .select("id")
        .single();
      setIsSubmitting(false);
      if (insertError || !inserted) {
        return setError(
          insertError?.code === "23505" ? DUPLICATE_PHONE : "Couldn't create this customer."
        );
      }
      show("Customer added");
      router.push(`/customers/${inserted.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <FormField label="Full name" error={errors.full_name?.message}>
        <Input {...register("full_name")} placeholder="e.g. Fatima Al-Sabah" />
      </FormField>
      <FormField label="Phone" error={errors.phone?.message}>
        <Input {...register("phone")} placeholder="+965 9900 0000" />
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" {...register("email")} placeholder="Optional" />
      </FormField>
      <FormField label="Birthday" error={errors.birthday?.message}>
        <Input type="date" {...register("birthday")} />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea {...register("notes")} placeholder="Preferences, allergies, notes…" />
      </FormField>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {customer ? "Save changes" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
