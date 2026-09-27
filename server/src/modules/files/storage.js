import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
const root = path.resolve(process.env.UPLOAD_DIR || "storage/uploads");
let client;
function s3() { return client ||= new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || "auto", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } }); }
function local(key) { if (!/^[a-f0-9-]+\.[a-z0-9]+$/.test(key)) throw new Error("Invalid storage key"); return path.join(root, key); }
export const storageProvider = () => process.env.STORAGE_PROVIDER === "s3" ? "S3" : "LOCAL";
export async function writeAsset(key, buffer, mime) {
  if (storageProvider() === "S3") await s3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mime }));
  else { await mkdir(root, { recursive: true }); await writeFile(local(key), buffer, { flag: "wx" }); }
}
export async function readAsset(key, provider) {
  if (provider === "S3") { const result = await s3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key })); return result.Body.transformToByteArray(); }
  return readFile(local(key));
}
export async function deleteAsset(key, provider) {
  if (provider === "S3") await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  else await unlink(local(key)).catch(error => { if (error.code !== "ENOENT") throw error; });
}
