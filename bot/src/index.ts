import * as dotenv from "dotenv";
dotenv.config();
import discord from "discord.js";
import { Settings as LuxonSettings } from "luxon";
import DB from "./db.js";
import CommandManager from "./command_manager.js";
import { fmtLog } from "./utils.js";
import { Command } from "./types.js";

// Set default timezone to UTC
LuxonSettings.defaultZone = "UTC";

const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });
const rest = new discord.REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN as string);
let commands: discord.Collection<string, Command> = new discord.Collection();

async function chatInputCommandHandler(interaction: discord.ChatInputCommandInteraction) {
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

async function buttonHandler(interaction: discord.ButtonInteraction) {
	// Split to command ([0]) & arguments ([1 - end])
	let args = interaction.customId.split("-");
	switch(args[0]) {
		default:
			break;
	}
}

client.on(discord.Events.InteractionCreate, async (interaction) => {
	if(interaction.isChatInputCommand()) chatInputCommandHandler(interaction);
	else if(interaction.isButton()) buttonHandler(interaction);
	else fmtLog("WARN", `Couldn't handle this type of interaction: ${interaction.type}!`)
});

client.once(discord.Events.ClientReady, (c) => {
	fmtLog("INFO", `Logged in as ${c.user.tag}!`)
});

async function main() {
	commands = await CommandManager.loadCommands();
	await CommandManager.registerCommands(commands, rest);
	client.login(process.env.DISCORD_BOT_TOKEN);
}
main();
