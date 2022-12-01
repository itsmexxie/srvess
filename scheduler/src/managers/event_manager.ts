import fs from "node:fs";
import path from "node:path";
import { fmtLog } from "../utils.js";
import { Event } from "../types";

const events: Map<string, Event> = new Map();

async function loadEvents() {
	for(const file of fs.readdirSync(path.resolve("out", "events")).filter(file => file.endsWith(".js"))) {
		const event = (await import(path.resolve("out", "events", file))).default;
		if(!("data" in event) || !("handle" in event)) {
			fmtLog("WARN", `Event handler ${event} is missing a required property (data, handle).`)
			continue;
		}
		events.set(event.data.name, event);
	}

	fmtLog("INFO", `Successfully loaded **${events.size}** event(s).`);
}

export default {
	events,
	loadEvents
};

export {
	events,
	loadEvents
};
