import amqp from "amqplib";
import nodemailer from "nodemailer";

interface Message {
  success: boolean;
  id: string;
}

const AMQP_URL = process.env.AMQP_URL as string;
const AMQP_QUEUE = process.env.AMQP_QUEUE as string;
const SMTP_HOST = process.env.SMTP_HOST as string;
const SMTP_PORT = +(process.env.SMTP_PORT || 1025);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
});

(async () => {
  const conn = await amqp.connect(`${AMQP_URL}`);
  const channel = await conn.createChannel();

  console.log("Connected to RabbitMQ");

  channel.consume(AMQP_QUEUE, async (msg) => {
    if (msg !== null) {
      const message = JSON.parse(msg.content.toString()) as Message;

      if (message.success === true) {
        await transporter.sendMail({
          from: "MyTube <notification@mytube.local>",
          to: "John Doe <john@doe.com>",
          subject: "Your video is ready!",
          text: `You can watch it here: http://localhost/${message.id}`,
          html: `<p>You can watch it here: <a href="http://localhost/${message.id}">http://localhost/${message.id}</a>`,
        });
      } else if (message.success === false) {
        await transporter.sendMail({
          from: "MyTube <notification@mytube.local>",
          to: "John Doe <john@doe.com>",
          subject: "Your video failed!",
          text: `Something went wrong with your video. Please try again later.`,
          html: `<p>Something went wrong with your video. Please try again later.</p>`,
        });
      }
    }
  });
})();
