import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { runSourceSyncCheck } from '../src/modules/source-sync/source-sync.service';

async function main() {
  const result = await runSourceSyncCheck('SYSTEM_SOURCE_SYNC');
  console.log(JSON.stringify({
    id: result.id,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    sourcesChecked: result.sourcesChecked,
    changesDetected: result.changesDetected,
    notes: result.notes,
    changes: result.changes.map((change) => ({
      id: change.id,
      changeType: change.changeType,
      summary: change.summary,
      sourceTitle: change.sourceDocument?.title ?? null,
      createdAt: change.createdAt,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
