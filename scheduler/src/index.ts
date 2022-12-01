// Initialize environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Import modules
import cron from "node-cron";
import { DateTime, Settings as LuxonSettings } from "luxon";
import DB from "./db.js";
import EventBus from "./eventbus.js";
import { fmtLog } from "./utils.js";

// Set default timezone to UTC
LuxonSettings.defaultZone = "UTC";

// Initialize stuff
const EVENTBUS = new EventBus(process.env.RABBITMQ_EXCHANGE as string, process.env.RABBITMQ_KEY?.split(":"));
const CRONTAB = cron.schedule("0 * * * *", async () => {
	fmtLog("INFO", "Running cron job.");
	const timestamp = DateTime.now().set({ second: 0, millisecond: 0 }).toUnixInteger().toString() + "000";
	const votingSessions = await DB.votingSession.findMany({ where: { endsAtTimestamp: timestamp }, select: { id: true } });
	for(const session of votingSessions) {
		EVENTBUS.publish("voting.close", JSON.stringify(session));
	}
});

EVENTBUS.on("message", (message) => {
	console.log(message);
});


async function main() {
	try {
		await EVENTBUS.connect(process.env.RABBITMQ_ADDRESS as string, process.env.RABBITMQ_USERNAME || "", process.env.RABBITMQ_PASSWORD || "")
		fmtLog("INFO", `Microservice **${process.env.MICROSERVICE_NAME}** successfully started!`);
	} catch(err) {
		fmtLog("ERROR", err as string);
		process.exit(1);
	}
}
main();
