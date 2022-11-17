import discord from "discord.js";
import { fmtLog } from "../utils.js";
import { Command } from "../types";

async function handle(interaction: discord.ChatInputCommandInteraction, client: discord.Client, commands: discord.Collection<String, Command>) {
	let cmd = commands.get(interaction.commandName);
	if(!cmd) {
		fmtLog("WARN", `Command ${interaction.commandName} not found!`);
		await interaction.reply({ content: "Unknown command!", ephemeral: true });
		return;
	}

	try {
		await cmd.execute(interaction);
	} catch(err) {
		fmtLog("ERROR", err as string);
		await interaction.reply({ content: "An unknown error occured while executing this command!", ephemeral: true });
	}
}

export default {
	data: {
		type: "chat_input_command"
	},
	handle
};
