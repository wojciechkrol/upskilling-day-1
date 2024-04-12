import amqp from "amqplib";
import * as Minio from "minio";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const AMQP_URL = process.env.AMQP_URL as string;
const AMQP_QUEUE = process.env.AMQP_QUEUE as string;
const MINIO_HOST = process.env.MINIO_HOST as string;
const MINIO_PORT = parseInt(process.env.MINIO_PORT as string);
const MINIO_BUCKET = process.env.MINIO_BUCKET as string;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY as string;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY as string;

const TMP_DIR = "/tmp";
const APP_DIR = "/app";
const WATERMARK_PATH = path.join(APP_DIR, "assets/watermark.png");

interface VideoMessage {
  id: string;
  videoPath: string;
}

const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadVideo(id: string): Promise<string> {
  const videoName = `${id}.mp4`;
  const videoStream = await minioClient.getObject(
    MINIO_BUCKET,
    `/input/${videoName}`
  );

  const videoTmpPath = path.join(TMP_DIR, videoName);
  const fileStream = fs.createWriteStream(videoTmpPath);

  return new Promise<string>((resolve, reject) => {
    videoStream.pipe(fileStream);
    videoStream.on("end", () => {
      resolve(videoTmpPath);
    });
    videoStream.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    const conn = await amqp.connect(`${AMQP_URL}`);
    const channel = await conn.createChannel();

    channel.consume(AMQP_QUEUE, async (msg) => {
      if (msg !== null) {
        console.log(`PROCESSING: Receiver message.`);
        const message = JSON.parse(msg.content.toString()) as VideoMessage;
        const { id } = message;

        // Sztuczne opóźnienie dla kolejki niskiego priorytetu
        if (AMQP_QUEUE === "low_priority_video_queue") {
          await sleep(5000);
        }

        try {
          console.log(`PROCESSING: Downloading video.`);
          const localVideo = await downloadVideo(id);
          const outputVideo = path.join(TMP_DIR, `${id}-output.mp4`);
          const ffmpegCommand = `ffmpeg -y -i ${localVideo} -i ${WATERMARK_PATH} -filter_complex "[1:v]scale=iw/3:-1:force_original_aspect_ratio=decrease,format=rgba,colorchannelmixer=aa=0.8[wm];[0:v][wm]overlay=W-w-25:H-h-25" -codec:a copy ${outputVideo}`;

          console.log(`PROCESSING: Watermarking video.`);
          await new Promise<void>((resolve, reject) => {
            exec(ffmpegCommand, (error, stdout, stderr) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });

          console.log(`PROCESSING: Uploading video.`);
          await minioClient.fPutObject(
            MINIO_BUCKET,
            `/output/${id}.mp4`,
            outputVideo
          );

          console.log(`PROCESSING: Cleaning up.`);
          fs.unlinkSync(localVideo);
          fs.unlinkSync(outputVideo);

          channel.ack(msg);
          channel.publish(
            "notification_exchange",
            "",
            Buffer.from(JSON.stringify({ success: true, id }))
          );
          console.log(`SUCCESS: Video ${id} has been watermarked.`);
        } catch (error) {
          channel.reject(msg, false);

          const e = error as Error;
          console.error(`ERROR: ${e.message}`);

          channel.publish(
            "notification_exchange",
            "",
            Buffer.from(JSON.stringify({ success: false, id }))
          );
        }
      }
    });
  } catch (error) {
    const e = error as Error;
    console.error(`ERROR: ${e.message}`);
  }
}

main();
