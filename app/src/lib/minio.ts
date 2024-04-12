import * as Minio from "minio";

const MINIO_HOST = process.env.MINIO_HOST as string;
const MINIO_PORT = parseInt(process.env.MINIO_PORT as string);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY as string;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY as string;

export const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});
