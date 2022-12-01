import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import discord from "discord.js";
import { fmtLog } from "../utils.js";
import { Command } from "../types.js";

const commands: Map<string, Command> = new Map();

async function registerCommands(rest: discord.REST) {
	const needUpdating: discord.SlashCommandBuilder[] = [];

	// Load the commands
	for(const file of fs.readdirSync(path.resolve("out", "commands")).filter(file => file.endsWith(".js"))) {
		const command = (await import(path.resolve("out", "commands", file))).default;
		if(!("data" in command) || !("execute" in command)) {
			fmtLog("WARN", `Command *${file}* is missing a required property (data, execute).`);
			continue;
		}
		commands.set(command.data.name, command);

		// Generate the current checksum of the file and load the cached one
		const checksumPath = path.resolve("out", "commands", `${file}.checksum`);
		if(!fs.existsSync(checksumPath)) fs.writeFileSync(checksumPath, "");
		const cachedChecksum = fs.readFileSync(checksumPath).toString();
		const currChecksum = crypto.createHash("sha256").update(fs.readFileSync(path.resolve("out", "commands", file))).digest("hex");

		// Check if they are different
		if(currChecksum != cachedChecksum) {
			fmtLog("INFO", `New checksum of command **${command.data.name}** is different from the cached value, updating...`);

			// Update the cached checksum
			fs.writeFileSync(checksumPath, currChecksum);

			// Stage the command for updating
			needUpdating.push(command.data);
		}
	}

	if(needUpdating.length > 0) {
		try {
			fmtLog("INFO", `Updating **${needUpdating.length}** application command(s)...`)
			const data = await rest.put(discord.Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID as string, "730853059374350348"), { body: needUpdating }) as [];
			fmtLog("INFO", `Successfully updated **${data.length}** application command(s).`);
		} catch(err) {
			fmtLog("ERROR", err as string);
		}
	} else {
		fmtLog("INFO", "No commands need updating, skipping...")
	}

	fmtLog("INFO", `Successfully loaded **${commands.size}** command(s).`);
}

export default {
	commands,
	registerCommands
};

export {
	commands,
	registerCommands
};
