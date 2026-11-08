"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function markNotificationsRead(ids?: string[]) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids && { id: { in: ids } }) },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
