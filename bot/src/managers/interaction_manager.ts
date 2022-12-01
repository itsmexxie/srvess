import fs from "node:fs";
import path from "node:path";
import { fmtLog } from "../utils.js";
import { Interaction } from "../types";

const interactions: Map<string, Interaction> = new Map();

async function loadInteractions() {
	for(const file of fs.readdirSync(path.resolve("out", "interactions")).filter(file => file.endsWith(".js"))) {
		const intr = (await import(path.resolve("out", "interactions", file))).default;
		if(!("data" in intr) || !("handle" in intr)) {
			fmtLog("WARN", `Interaction handler ${file} is missing a required property (data, handle).`)
			continue;
		}
		interactions.set(intr.data.type, intr);
	}

	fmtLog("INFO", `Successfully loaded **${interactions.size}** interaction(s).`);
}

export default {
	interactions,
	loadInteractions
};

export {
	interactions,
	loadInteractions
};
