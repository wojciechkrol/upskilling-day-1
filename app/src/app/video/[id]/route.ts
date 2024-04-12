import { minioClient } from "@/lib/minio";
import mongoose from "mongoose";
import "../../../lib/mongo";

interface Argument {
  params: {
    id: string;
  };
}

const MINIO_BUCKET = process.env.MINIO_BUCKET as string;

export async function GET(request: Request, arg: Argument): Promise<Response> {
  const video = await mongoose.model("Video").findById(arg.params.id);

  if (!video) {
    return new Response("Not found", { status: 404 });
  }

  return new Promise<Response>((resolve, reject) => {
    minioClient.getObject(
      MINIO_BUCKET,
      `/output/${video._id}.mp4`,
      (error, stream) => {
        if (error) {
          resolve(new Response("Video not ready yet", { status: 404 }));
          return;
        }

        const chunks: any[] = [];
        stream?.on("data", (chunk) => {
          chunks.push(chunk);
        });
        stream?.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: 200,
              headers: { "Content-Type": "video/mp4" },
            })
          );
        });
        stream?.on("error", (err) => {
          reject(err);
        });
      }
    );
  });
}
