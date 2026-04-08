"use server";

import { MovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canDispenseStock, canManageInventory, canReceiveStock } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const productSchema = z.object({
  productName: z.string().min(2),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  category: z.string().min(2),
  supplier: z.string().min(2),
  batchNumber: z.string().min(2),
  quantity: z.coerce.number().int().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  expiryDate: z.string().min(1),
  reorderLevel: z.coerce.number().int().min(0),
});

const movementTypeSchema = z.nativeEnum(MovementType);

const movementSchema = z.object({
  productId: z.string().min(1),
  type: movementTypeSchema,
  quantity: z.coerce.number().int().min(1),
  note: z.string().optional(),
});

function refreshInventoryViews() {
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}

export async function createProductAction(formData: FormData) {
  const user = await requireUser();

  if (!canManageInventory(user.role) || !user.pharmacyId) {
    throw new Error("You do not have permission to create products.");
  }

  const parsed = productSchema.parse({
    productName: formData.get("productName"),
    genericName: formData.get("genericName"),
    brandName: formData.get("brandName"),
    category: formData.get("category"),
    supplier: formData.get("supplier"),
    batchNumber: formData.get("batchNumber"),
    quantity: formData.get("quantity"),
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    expiryDate: formData.get("expiryDate"),
    reorderLevel: formData.get("reorderLevel"),
  });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        pharmacyId: user.pharmacyId,
        ...parsed,
        genericName: parsed.genericName || null,
        brandName: parsed.brandName || null,
        expiryDate: new Date(parsed.expiryDate),
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        pharmacyId: user.pharmacyId,
        movementType: MovementType.INITIAL,
        quantity: parsed.quantity,
        note: "Opening stock added during product creation",
        createdById: user.id,
      },
    });
  });

  refreshInventoryViews();
  redirect("/inventory");
}

export async function updateProductAction(productId: string, formData: FormData) {
  const user = await requireUser();

  if (!canManageInventory(user.role) || !user.pharmacyId) {
    throw new Error("You do not have permission to update products.");
  }

  const parsed = productSchema.parse({
    productName: formData.get("productName"),
    genericName: formData.get("genericName"),
    brandName: formData.get("brandName"),
    category: formData.get("category"),
    supplier: formData.get("supplier"),
    batchNumber: formData.get("batchNumber"),
    quantity: formData.get("quantity"),
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    expiryDate: formData.get("expiryDate"),
    reorderLevel: formData.get("reorderLevel"),
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...parsed,
      genericName: parsed.genericName || null,
      brandName: parsed.brandName || null,
      expiryDate: new Date(parsed.expiryDate),
    },
  });

  refreshInventoryViews();
  redirect("/inventory");
}

export async function archiveProductAction(productId: string) {
  const user = await requireUser();

  if (!canManageInventory(user.role)) {
    throw new Error("You do not have permission to archive products.");
  }

  await prisma.product.update({
    where: { id: productId },
    data: { isArchived: true },
  });

  refreshInventoryViews();
}

export async function createStockMovementAction(formData: FormData) {
  const user = await requireUser();

  if (!user.pharmacyId) {
    throw new Error("You do not have permission to log stock movements.");
  }

  const parsed = movementSchema.parse({
    productId: formData.get("productId"),
    type: formData.get("type") ?? formData.get("movementType"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });

  if (parsed.type === MovementType.OUT) {
    if (!canDispenseStock(user.role)) {
      throw new Error("You do not have permission to dispense stock.");
    }
  } else if (parsed.type === MovementType.IN || parsed.type === MovementType.ADJUSTMENT) {
    if (!canReceiveStock(user.role)) {
      throw new Error("You do not have permission to receive or adjust stock.");
    }
  } else {
    throw new Error("Opening stock can only be recorded during product creation.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.productId,
      pharmacyId: user.pharmacyId,
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  let nextQuantity = product.quantity;
  let loggedQuantity = parsed.quantity;

  if (parsed.type === MovementType.IN) {
    nextQuantity = product.quantity + parsed.quantity;
  }

  if (parsed.type === MovementType.OUT) {
    nextQuantity = Math.max(0, product.quantity - parsed.quantity);
    loggedQuantity = Math.min(parsed.quantity, product.quantity);
  }

  if (parsed.type === MovementType.ADJUSTMENT) {
    loggedQuantity = parsed.quantity - product.quantity;
    nextQuantity = parsed.quantity;
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { quantity: nextQuantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId: product.id,
        pharmacyId: user.pharmacyId,
        movementType: parsed.type,
        quantity: loggedQuantity,
        note: parsed.note || null,
        createdById: user.id,
      },
    }),
  ]);

  refreshInventoryViews();
}
