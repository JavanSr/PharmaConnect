"use server";

import { ComplianceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canManageCompliance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const complianceSchema = z.object({
  title: z.string().min(4),
  category: z.string().min(3),
  authority: z.string().min(3),
  deadlineDate: z.string().min(1),
  reminderDate: z.string().min(1),
  status: z.nativeEnum(ComplianceStatus),
  notes: z.string().optional(),
});

function refreshComplianceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/compliance");
}

export async function createComplianceItemAction(formData: FormData) {
  const user = await requireUser();

  if (!canManageCompliance(user.role) || !user.pharmacyId) {
    throw new Error("You do not have permission to manage compliance items.");
  }

  const parsed = complianceSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    authority: formData.get("authority"),
    deadlineDate: formData.get("deadlineDate"),
    reminderDate: formData.get("reminderDate"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  await prisma.complianceItem.create({
    data: {
      ...parsed,
      deadlineDate: new Date(parsed.deadlineDate),
      reminderDate: new Date(parsed.reminderDate),
      notes: parsed.notes || null,
      pharmacyId: user.pharmacyId,
      createdById: user.id,
    },
  });

  refreshComplianceViews();
  redirect("/compliance");
}

export async function updateComplianceItemAction(itemId: string, formData: FormData) {
  const user = await requireUser();

  if (!canManageCompliance(user.role)) {
    throw new Error("You do not have permission to manage compliance items.");
  }

  const parsed = complianceSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    authority: formData.get("authority"),
    deadlineDate: formData.get("deadlineDate"),
    reminderDate: formData.get("reminderDate"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  await prisma.complianceItem.update({
    where: { id: itemId },
    data: {
      ...parsed,
      deadlineDate: new Date(parsed.deadlineDate),
      reminderDate: new Date(parsed.reminderDate),
      notes: parsed.notes || null,
    },
  });

  refreshComplianceViews();
  redirect("/compliance");
}

export async function deleteComplianceItemAction(itemId: string) {
  const user = await requireUser();

  if (!canManageCompliance(user.role)) {
    throw new Error("You do not have permission to delete compliance items.");
  }

  await prisma.complianceItem.delete({
    where: { id: itemId },
  });

  refreshComplianceViews();
}
