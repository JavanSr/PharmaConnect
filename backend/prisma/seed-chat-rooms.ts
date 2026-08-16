// Chat Room V1 launch seed — deliberately just two rooms, not one per region.
// An empty regional room reads as "nobody is here" and actively hurts the
// product; #all-tanzania concentrates the whole early user base into one
// room worth checking. Regional rooms (kind: REGIONAL) get created with
// isActive: false when/if a region has enough members to sustain
// conversation on its own — see the ChatRoom model comment in schema.prisma.
import 'dotenv/config';
import { PrismaClient, ChatRoomKind } from '@prisma/client';

function createPrismaClient(url?: string) {
  return new PrismaClient({
    datasources: {
      db: {
        url: url || process.env.DATABASE_URL,
      },
    },
  });
}

const prisma = createPrismaClient(process.env.DIRECT_URL || process.env.DATABASE_URL);

const LAUNCH_ROOMS = [
  {
    slug: 'all-tanzania',
    name: 'All Tanzania',
    kind: ChatRoomKind.NATIONAL,
    region: null,
    description: 'The main room — every APOTEKH user is here. Cases, questions, stock help, general discussion.',
    isReadOnly: false,
  },
  {
    slug: 'drug-alerts',
    name: 'Drug Alerts',
    kind: ChatRoomKind.DRUG_ALERTS,
    region: null,
    description: 'TMDA bulletins, recalls, and safety notices. Read-only — posted by APOTEKH, not by members.',
    isReadOnly: true,
  },
];

async function main() {
  console.log(`Seeding ${LAUNCH_ROOMS.length} launch chat rooms...`);

  for (const room of LAUNCH_ROOMS) {
    await prisma.chatRoom.upsert({
      where: { slug: room.slug },
      update: {
        name: room.name,
        kind: room.kind,
        region: room.region,
        description: room.description,
        isReadOnly: room.isReadOnly,
      },
      create: room,
    });
    console.log(`  ready: #${room.slug}`);
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Chat room seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
