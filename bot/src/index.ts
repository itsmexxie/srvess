import * as dotenv from "dotenv";
dotenv.config();
import discord from "discord.js";
import { Settings as LuxonSettings } from "luxon";
import DB from "./db.js";
import CommandManager from "./managers/command_manager.js";
import InteractionManager from "./managers/interaction_manager.js";
import { fmtLog } from "./utils.js";

// Set default timezone to UTC
LuxonSettings.defaultZone = "UTC";

const CLIENT = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });
const REST = new discord.REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN as string);

CLIENT.on(discord.Events.InteractionCreate, (interaction) => {
	if(interaction.isChatInputCommand()) return InteractionManager.interactions.get("chat_input_command")?.handle(interaction, CLIENT, CommandManager.commands);
	else if(interaction.isButton()) return InteractionManager.interactions.get("button")?.handle(interaction, CLIENT);
	else {
		fmtLog("WARN", `Couldn't handle that type of interaction (${interaction.type}).`);
		return;
	}
});

CLIENT.once(discord.Events.ClientReady, (c) => {
	fmtLog("INFO", `Logged in as ${c.user.tag}!`)
});

async function main() {
	await CommandManager.registerCommands(REST);
	await InteractionManager.loadInteractions();
	CLIENT.login(process.env.DISCORD_BOT_TOKEN);
}
main();
