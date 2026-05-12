import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type SupabaseClient = {
  storage: {
    getBucket: (bucket: string) => Promise<{ error: { message: string } | null }>;
    createBucket: (
      bucket: string,
      options: { public: boolean; fileSizeLimit: string },
    ) => Promise<{ error: { message: string } | null }>;
    from: (bucket: string) => {
      upload: (
        path: string,
        buffer: Buffer,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string }; error: { message: string } | null }>;
    };
  };
};

type StorageMode = 'supabase' | 'local';

export type StoredObject = {
  storageMode: StorageMode;
  bucket: string;
  filePath: string;
  url: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  null;
const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
const SIGNED_URL_TTL_SECONDS = 60 * 60;

let supabaseClient: SupabaseClient | null | undefined;
const ensuredBuckets = new Set<string>();

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = null;
    return supabaseClient;
  }

  try {
    const { createClient } = require('@supabase/supabase-js') as {
      createClient: (
        url: string,
        key: string,
        options: {
          auth: {
            persistSession: boolean;
            autoRefreshToken: boolean;
          };
        },
      ) => SupabaseClient;
    };

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch {
    supabaseClient = null;
  }

  return supabaseClient;
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'file';
}

async function ensureBucket(bucket: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || ensuredBuckets.has(bucket)) {
    return;
  }

  const existing = await supabase.storage.getBucket(bucket);
  if (existing.error) {
    await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: '10MB',
    });
  }

  ensuredBuckets.add(bucket);
}

export async function storeComplianceObject(input: {
  bucket: string;
  folder: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}): Promise<StoredObject> {
  const safeFileName = sanitizeSegment(input.fileName);
  const relativeObjectPath = `${input.folder}/${Date.now()}-${safeFileName}`.replace(/\\/g, '/');
  const supabase = getSupabaseClient();

  if (supabase) {
    await ensureBucket(input.bucket);
    const { error } = await supabase.storage
      .from(input.bucket)
      .upload(relativeObjectPath, input.buffer, {
        contentType: input.contentType,
        upsert: true,
      });

    if (!error) {
      const { data: signed, error: signedError } = await supabase.storage
        .from(input.bucket)
        .createSignedUrl(relativeObjectPath, SIGNED_URL_TTL_SECONDS);

      if (signedError) {
        throw new Error(signedError.message);
      }

      return {
        storageMode: 'supabase',
        bucket: input.bucket,
        filePath: relativeObjectPath,
        url: signed.signedUrl,
      };
    }
  }

  const relativeLocalPath = path.join('uploads', input.bucket, relativeObjectPath).replace(/\\/g, '/');
  const absoluteLocalPath = path.join(UPLOAD_ROOT, input.bucket, relativeObjectPath);
  await mkdir(path.dirname(absoluteLocalPath), { recursive: true });
  await writeFile(absoluteLocalPath, input.buffer);

  return {
    storageMode: 'local',
    bucket: input.bucket,
    filePath: relativeLocalPath,
    url: `/${relativeLocalPath.replace(/\\/g, '/')}`,
  };
}

export async function getComplianceObjectUrl(bucket: string, filePath: string): Promise<string> {
  if (!filePath) {
    return '';
  }

  if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(getSupabaseClient());
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}
