import 'dotenv/config';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corsPath = join(__dirname, '..', 'b2-cors-config.json');
const rules = JSON.parse(readFileSync(corsPath, 'utf8'));

const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const B2_NATIVE_OP_TO_S3_METHOD = {
  s3ListBucket: 'GET',
  s3GetObject: 'GET',
  s3PutObject: 'PUT',
  s3DeleteObject: 'DELETE',
  s3PostObject: 'POST',
  s3GetBucketLocation: 'GET',
};

const command = new PutBucketCorsCommand({
  Bucket: process.env.B2_BUCKET,
  CORSConfiguration: {
    CORSRules: rules.map((r) => ({
      AllowedOrigins: r.allowedOrigins,
      AllowedMethods: [...new Set(r.allowedOperations.map((op) => B2_NATIVE_OP_TO_S3_METHOD[op]).filter(Boolean))],
      AllowedHeaders: r.allowedHeaders,
      ExposeHeaders: r.exposeHeaders,
      MaxAgeSeconds: r.maxAgeSeconds,
    })),
  },
});

try {
  await s3.send(command);
  console.log(`CORS configuration applied to bucket "${process.env.B2_BUCKET}".`);
} catch (err) {
  console.error('Failed to apply CORS configuration:', err.message || err);
  process.exit(1);
}
