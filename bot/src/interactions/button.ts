import discord from "discord.js";
import DB from "../db.js";
import EventBus from "../eventbus.js";
import { fmtLog, fingerprintGenerator } from "../utils.js";

async function handle(interaction: discord.ButtonInteraction, eventbus: EventBus) {
	// Split to command ([0]) & arguments ([1 - end])
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

export default {
	data: {
		type: "button"
	},
	handle
};
