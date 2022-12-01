import discord from "discord.js";
import EventBus from "../eventbus.js";
import { commands } from "../managers/command_manager.js";
import { fmtLog } from "../utils.js";

async function handle(interaction: discord.ChatInputCommandInteraction, eventbus: EventBus) {
	let cmd = commands.get(interaction.commandName);
	if(!cmd) {
		fmtLog("WARN", `Command ${interaction.commandName} not found!`);
		await interaction.reply({ content: "Unknown command!", ephemeral: true });
		return;
	}

	try {
		await cmd.execute(interaction, eventbus);
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
