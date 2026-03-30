"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPillar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const color = formData.get("color") as string;

  const { error } = await supabase.from("content_pillars").insert({
    name,
    description: description || null,
    color: color || "#6366f1",
    sort_order: 0,
    user_id: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pillars");
}

export async function updatePillar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const color = formData.get("color") as string;

  const { error } = await supabase
    .from("content_pillars")
    .update({
      name,
      description: description || null,
      color: color || "#6366f1",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pillars");
}

export async function deletePillar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("content_pillars")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pillars");
}
