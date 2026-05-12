DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pharmacyId'
  ) THEN
    ALTER TABLE public."users" RENAME COLUMN "pharmacyId" TO "last_pharmacy_id";
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'pharmacy_id'
  ) THEN
    ALTER TABLE public."users" RENAME COLUMN "pharmacy_id" TO "last_pharmacy_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'LOCUM'
        AND enumtypid = '"UserRole"'::regtype
    ) THEN
      ALTER TYPE "UserRole" ADD VALUE 'LOCUM';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PharmacyMembershipRole') THEN
    CREATE TYPE "PharmacyMembershipRole" AS ENUM (
      'OWNER',
      'PHARMACIST_IN_CHARGE',
      'DISPENSER',
      'LOCUM'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."pharmacy_memberships" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "pharmacy_id" TEXT NOT NULL,
  "role" "PharmacyMembershipRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "valid_from" TIMESTAMP(3),
  "valid_until" TIMESTAMP(3),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pharmacy_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pharmacy_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_memberships_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES public."pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pharmacy_memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_memberships_user_pharmacy_key"
  ON public."pharmacy_memberships"("user_id", "pharmacy_id");

CREATE INDEX IF NOT EXISTS "pharmacy_memberships_pharmacy_active_valid_until_idx"
  ON public."pharmacy_memberships"("pharmacy_id", "active", "valid_until");

CREATE INDEX IF NOT EXISTS "pharmacy_memberships_user_active_valid_until_idx"
  ON public."pharmacy_memberships"("user_id", "active", "valid_until");

INSERT INTO public."pharmacy_memberships" (
  "id",
  "user_id",
  "pharmacy_id",
  "role",
  "active",
  "valid_from",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  u."id",
  u."last_pharmacy_id",
  CASE
    WHEN u."role" = 'OWNER' THEN 'OWNER'::"PharmacyMembershipRole"
    WHEN u."role" = 'PHARMACIST_IN_CHARGE' THEN 'PHARMACIST_IN_CHARGE'::"PharmacyMembershipRole"
    WHEN u."role" = 'DISPENSER' THEN 'DISPENSER'::"PharmacyMembershipRole"
    WHEN u."role" = 'LOCUM' THEN 'LOCUM'::"PharmacyMembershipRole"
    WHEN u."role" = 'CASHIER' THEN 'DISPENSER'::"PharmacyMembershipRole"
    WHEN u."role" = 'WHOLESALE_MANAGER' THEN 'OWNER'::"PharmacyMembershipRole"
    WHEN u."role" = 'WHOLESALE_COUNTER_STAFF' THEN 'DISPENSER'::"PharmacyMembershipRole"
    WHEN u."role" = 'DELIVERY_STAFF' THEN 'DISPENSER'::"PharmacyMembershipRole"
    WHEN u."role" = 'WHOLESALE_SELLER' THEN 'OWNER'::"PharmacyMembershipRole"
    ELSE 'DISPENSER'::"PharmacyMembershipRole"
  END,
  COALESCE(u."isActive", true),
  COALESCE(u."createdAt", CURRENT_TIMESTAMP),
  u."id",
  COALESCE(u."createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM public."users" u
WHERE u."last_pharmacy_id" IS NOT NULL
ON CONFLICT ("user_id", "pharmacy_id") DO NOTHING;
