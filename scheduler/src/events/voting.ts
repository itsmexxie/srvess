import DB from "../db.js";
import { EventBusMessage } from "../types";
import { fmtLog } from "../utils.js";

const eventActionHandler: { [key: string]: (message: EventBusMessage) => void } = {};

export default {
	data: {
		name: "voting"
	},
	async handle(message: EventBusMessage) {
		let eventAction = message.key.split(".")[2];
		if(!(eventAction in eventActionHandler)) {
			fmtLog("ERROR", `Event action: *${eventAction}* for event: *${message.key.split(".")[1]}* not found!`)
			return;
		}
		await eventActionHandler[eventAction](message);
	}
};
