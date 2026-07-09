-- Schema drift fix: the Prisma model has userId String? (pharmacy-wide
-- notifications use NULL, and the notifications router already matches
-- { userId: null } as "visible to everyone in the pharmacy"), but the table
-- was created with NOT NULL — making every pharmacy-wide notification fail.
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;
