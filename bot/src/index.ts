// Initialize environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Import modules
import discord from "discord.js";
import { Settings as LuxonSettings } from "luxon";
import DB from "./db.js";
import EventBus from "./eventbus.js";
import EventManager from "./managers/event_manager.js";
import CommandManager from "./managers/command_manager.js";
import { fmtLog, fingerprintGenerator } from "./utils.js";
import { EventBusMessage } from "./types.js";

// Set default timezone to UTC
LuxonSettings.defaultZone = "UTC";

// Initialize stuff
const EVENTBUS = new EventBus(process.env.RABBITMQ_EXCHANGE as string);
const CLIENT = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });
const REST = new discord.REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN as string);

EVENTBUS.on("message", async (message: EventBusMessage) => {
	const event = EventManager.events.get(message.key.split(".")[1]);
	if(!event) return fmtLog("ERROR", `Unknown event namespace: *${message.key.split(".")[1]}*`);
	await event.handle(CLIENT, message);
});

CLIENT.on(discord.Events.InteractionCreate, async (interaction) => {
	if(interaction.isChatInputCommand()) {
		let cmd = CommandManager.commands.get(interaction.commandName);
		if(!cmd) return fmtLog("ERROR", `Unknown chat input interaction: **${interaction.commandName}**!`);

		try {
			await cmd.execute(interaction, EVENTBUS);
		} catch(err) {
			fmtLog("ERROR", err as string);
			await interaction.reply({ content: "An unknown error occured while executing this command!", ephemeral: true });
		}
	}
	else if(interaction.isButton()) {
		let args = interaction.customId.split("-");
		switch(args[0]) {
			case "voting":
				try {
					await DB.vote.create({
						data: {
							userId: (await DB.user.upsert({
								where: { discordId: interaction.user.id },
								update: {},
								create: {
									id: fingerprintGenerator().toString(),
									discordId: interaction.user.id
								}
							})).id,
							votingSessionId: args[1],
							votingOptionId: args[2]
						}
					});
					interaction.reply({ content: "Thank you for voting!", ephemeral: true });
				} catch(err) {
					interaction.reply({ content: "You can only vote once!", ephemeral: true });
				}
				break;

			default:
				break;
		}
	}
	else {
		fmtLog("WARN", `Couldn't handle that type of interaction *(${interaction.type})*.`);
		return;
	}
});

CLIENT.on(discord.Events.GuildCreate, (guild) => {
	// Create new guild database entry
	DB.guild.upsert({
		where: { id: guild.id },
		update: {},
		create: { id: guild.id, votingGlyphs: JSON.stringify([["✅", "❎"], ["🇦", "🇧", "🇨", "🇩"]]) },
	});

	fmtLog("INFO", `Joined guild ${guild.name}.`);
});

CLIENT.once(discord.Events.ClientReady, (c) => {
	fmtLog("INFO", `Logged in as **${c.user.tag}**.`)
});

// Initialize main function
async function main() {
	try {
		await EventManager.loadEvents();
		await CommandManager.registerCommands(REST);
		await EVENTBUS.connect(process.env.RABBITMQ_ADDRESS as string, process.env.RABBITMQ_USERNAME || "", process.env.RABBITMQ_PASSWORD || "");
		await CLIENT.login(process.env.DISCORD_BOT_TOKEN);
		fmtLog("INFO", `Microservice **${process.env.MICROSERVICE_NAME}** successfully started!`);
	} catch(err) {
		fmtLog("ERROR", err as string)
		process.exit(1);
	}
}
main();
