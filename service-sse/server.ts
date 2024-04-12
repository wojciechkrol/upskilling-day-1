import { serve } from "@hono/node-server";
import amqp from "amqplib";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SSEStreamingApi, streamSSE } from "hono/streaming";

interface Message {
  success: boolean;
  id: string;
}

const AMQP_URL = process.env.AMQP_URL as string;
const AMQP_QUEUE = process.env.AMQP_QUEUE as string;

const app = new Hono();

const subscribers = new Map<string, SSEStreamingApi[]>([]);

app.use("/sse/*", cors());

app.get("/sse/:topic", (c) => {
  const topic = c.req.param("topic");

  return streamSSE(c, async (stream) => {
    if (!subscribers.has(topic)) {
      subscribers.set(topic, []);
    }

    subscribers.get(topic)?.push(stream);

    stream.onAbort(() => {
      const streams = subscribers.get(topic);
      if (streams) {
        subscribers.set(
          topic,
          streams.filter((s) => s !== stream)
        );
      }
    });
  });
});

(async () => {
  const conn = await amqp.connect(`${AMQP_URL}`);
  const channel = await conn.createChannel();

  console.log("Connected to RabbitMQ");

  channel.consume(AMQP_QUEUE, async (msg) => {
    if (msg !== null) {
      try {
        const message = JSON.parse(msg.content.toString()) as Message;
        const topic = message.id;

        const streams = subscribers.get(topic);
        if (streams) {
          for (const stream of streams) {
            stream.writeSSE({
              data: JSON.stringify({ success: message.success }),
            });
          }
        }
        channel.ack(msg);
      } catch (error) {
        console.error(error);
        channel.reject(msg, false);
      }
    }
  });
})();

serve({
  fetch: app.fetch,
  port: 8081,
});
