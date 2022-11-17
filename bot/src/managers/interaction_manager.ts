import fs from "node:fs";
import path from "node:path";
import discord from "discord.js";
import { fmtLog } from "../utils.js";
import { Interaction } from "../types";

const interactions: discord.Collection<string, Interaction> = new discord.Collection();

async function loadInteractions() {
	const intrFiles = fs.readdirSync(path.resolve("out", "interactions")).filter(file => file.endsWith(".js"));
	for(const file of intrFiles) {
		const intr = (await import(path.resolve("out", "interactions", file))).default;
		if(!("data" in intr) || !("handle" in intr)) {
			fmtLog("WARN", `Interaction handler ${file} is missing a required property (data, handle).`)
			continue;
		}
		interactions.set(intr.data.type, intr);
	}
}

export default {
	interactions,
	loadInteractions
};

export {
	interactions,
	loadInteractions
};
