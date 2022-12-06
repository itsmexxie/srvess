import { EventEmitter } from "node:events";
import amqp from "amqplib";
import { fmtLog } from "./utils.js";

class EventBus extends EventEmitter {
	connection: amqp.Connection | null;
	channel: amqp.Channel | null;
	exchange: string;
	keys: string[];
	queue: string;

	constructor(exchange: string, keys: string[] = ["*.*.*"]) {
		super();
		if(!exchange) throw("Exchange can't be an empty string!");

		this.connection = null;
		this.channel = null;
		this.exchange = exchange;
		this.keys = keys;
		this.queue = "";
	}

	async connect(url: string, user = "guest", pass = "guest") {
		if(!url) throw("Can't connect to EventBus without connection details!");
		const timeout =	setTimeout(function() {
			throw("Timed out trying to connect to EventBus!")
		}, 20000);

		// Basic connection stuff
		try {
			this.connection = await amqp.connect(`amqp://${user}:${pass}@${url}`);
			this.channel = await this.connection.createChannel();
			await this.channel.assertExchange(this.exchange, "topic", { durable: false });

			// Assert exclusive queue and bind it to the exchange
			this.queue = (await this.channel.assertQueue("", { exclusive: true })).queue;
			for(const key of this.keys) {
				this.channel.bindQueue(this.queue, this.exchange, key);
			}
			this.channel.consume(this.queue, (message) => {
				this.emit("message", { key: message?.fields.routingKey, content: JSON.parse(message?.content.toString() || "{}") });
			}, { noAck: true });

			clearTimeout(timeout);
			fmtLog("INFO", `Successfully initialized EventBus on exchange: **${this.exchange}**!`);
		} catch(err) {
			clearTimeout(timeout);
			throw(err as string);
		}
	}

	async publish(key: string, message: string) {
		if(!this.connection || !this.channel) throw("Can't publish to EventBus without a connection!");
		this.channel?.publish(this.exchange, `${process.env.MICROSERVICE_NAME}.${key}`, Buffer.from(message));
		fmtLog("INFO", `Published a message to EventBus: ${message}`);
	}
}

export default EventBus;

export {
	EventBus
};
