import amqp from "amqplib";

const AMQP_URL = "amqp://client:client@localhost:5672/mytube";

console.log("Connecting to RabbitMQ...");

async function main() {
  const conn = await amqp.connect(`${AMQP_URL}`);
  const channel = await conn.createChannel();

  console.log("It works!");
}

main();
