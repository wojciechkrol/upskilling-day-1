import { minioClient } from "@/lib/minio";
import amqp from "amqplib";
import mongoose from "mongoose";
import { z } from "zod";
import "../../lib/mongo";

const AMQP_URL = process.env.AMQP_URL as string;
const MINIO_BUCKET = process.env.MINIO_BUCKET as string;

export async function POST(request: Request): Promise<Response> {
  const conn = await amqp.connect(`${AMQP_URL}`);
  const channel = await conn.createChannel();

  const formData = await request.formData();

  const priority = formData.get("priority") as string;
  const file = formData.get("video") as File;

  if (!file) {
    return new Response("File not found", { status: 400 });
  }

  const fileSchema = z.object({
    type: z.string().refine((value) => value === "video/mp4", {
      message: "File must be in MP4 format",
    }),
  });

  const fileInfo = fileSchema.safeParse({
    type: file.type,
  });

  if (!fileInfo.success) {
    return new Response(fileInfo.error.message, { status: 400 });
  }

  const video = await mongoose.model("Video").create({
    status: "processing",
    createdAt: new Date(),
  });

  const videoName = `${video._id}.mp4`;
  const fileBuffer = await file.arrayBuffer();
  const fileData = Buffer.from(fileBuffer);

  await minioClient.putObject(
    MINIO_BUCKET,
    `/input/${videoName}`,
    fileData,
    file.size
  );

  channel.publish(
    "video_exchange",
    "",
    Buffer.from(JSON.stringify({ id: video._id })),
    {
      headers: {
        priority: priority || "low",
      },
    }
  );

  return Response.json({ success: true, id: video._id }, { status: 200 });
}
