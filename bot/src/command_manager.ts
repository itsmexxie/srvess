import fs from "node:fs";
import path from "node:path";
import discord from "discord.js";
import { fmtLog } from "./utils.js";
import { Command } from "./types.js";

async function loadCommands() {
	const commands: discord.Collection<string, Command> = new discord.Collection();

	let cmdFiles = fs.readdirSync(path.resolve("out", "commands")).filter(file => file.endsWith(".js"));
	for(const file of cmdFiles) {
		const cmd = (await import(path.resolve("out", "commands", file))).default;
		if(!("data" in cmd) || !("execute" in cmd)) {
			fmtLog("WARN", `Command ${file} is missing a required property (data, execute).`);
			continue;
		}
		commands.set(cmd.data.name, cmd);
	}

	return commands;
}

async function registerCommands(commands: discord.Collection<string, Command>, rest: discord.REST) {
	try {
		fmtLog("INFO", `Refreshing ${commands.size} application commands...`)
		const data = await rest.put(discord.Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID as string, "730853059374350348"), { body: commands.map(c => c.data) }) as [];
		fmtLog("INFO", `Successfully refreshed ${data.length} application command(s)!`);
	} catch(err) {
		fmtLog("ERROR", err as string);
	}
}

export default {
	loadCommands,
	registerCommands
};
