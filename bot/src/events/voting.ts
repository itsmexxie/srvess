import { Client, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { DateTime } from "luxon";
import DB from "../db.js";
import { EventBusMessage } from "../types";
import { fmtLog } from "../utils.js";

async function actionCreate(client: Client, message: EventBusMessage) {
	// Get guild info
	let guild = (await DB.guild.findUnique({ where: { id: message.content.guildId } }))!;

	// * ===== Create voting session message ======
	const embed = new EmbedBuilder()
		.setTitle(`Voting session #${message.content.number}`)
		.setColor(0x00AAFF)
		.addFields({ name: "Question:", value: message.content.question })
		.setFooter({ text: `Ends at ${DateTime.fromMillis(parseInt(message.content.endsAtTimestamp), { zone: guild.timezone }).toFormat("MMMM dd, yyyy - HH:mm")}` });
	const buttons = new ActionRowBuilder<ButtonBuilder>();

	let optionsString = "";
	for(let i = 0; i < message.content.options.length; i++) {
		let optionGlyph = JSON.parse(guild.votingGlyphs)[message.content.type][i];

		optionsString += `${optionGlyph} **${message.content.options[i].content}**`;
		if(i != (message.content.options.length - 1)) optionsString += "\n";

		buttons.addComponents(new ButtonBuilder()
			.setCustomId(`voting-${message.content.id}-${message.content.options[i].id}`)
			.setLabel(message.content.options[i].content)
			.setEmoji(optionGlyph)
			.setStyle(ButtonStyle.Primary));
	}
	embed.addFields({ name: "Options:", value: optionsString });

	// Get voting channel and send the embed
	const votingChannel = (client.guilds.cache.get(guild.id)?.channels.cache.get(guild.votingChannelId) as TextChannel) || client.guilds.cache.get(guild.id)?.systemChannel;
	votingChannel.send({ embeds: [embed], components: [buttons] });
}

async function actionClose(client: Client, message: EventBusMessage) {
	// Get voting session and guild info
	const guild = (await DB.guild.findUnique({ where: { id: message.content.guildId } }))!;

	// Close the voting session
	console.log(message.content.id);
	await DB.votingSession.update({ where: { id: message.content.id }, data: { closed: true } });

	// Create the voting results embed
	const embed = new EmbedBuilder()
		.setTitle(`Voting session #${message.content.number} ended, here are the results!`)
		.setColor(0x00FF00)
		.addFields({ name: "Question:", value: message.content.question })
		.setFooter({ text: `Ended at ${DateTime.fromMillis(parseInt(message.content.endsAtTimestamp), { zone: guild.timezone }).toFormat("MMMM dd, yyyy - HH:mm")}` });

	let optionsString = "";
	let totalVotes = await DB.vote.count({ where: { votingSessionId: message.content.id } });
	for(let i = 0; i < message.content.options.length; i++) {
		let optionGlyph = JSON.parse(guild.votingGlyphs)[message.content.type][i];
		let optionVotes = await DB.vote.count({ where: { votingSessionId: message.content.id, votingOptionId: message.content.options[i].id } });
		optionsString += `${optionGlyph} **${message.content.options[i].content}** - ${optionVotes} (${totalVotes > 0 ? ((optionVotes / totalVotes) * 100).toPrecision(3) : 0}%)`;
		if(i != (message.content.options.length - 1)) optionsString += "\n";
	}
	embed.addFields({ name: "Options:", value: optionsString });

	// Get voting channel and send the embed
	const votingChannel = (client.guilds.cache.get(guild.id)?.channels.cache.get(guild.votingChannelId) as TextChannel) || client.guilds.cache.get(guild.id)?.systemChannel;
	votingChannel.send({ embeds: [embed] });
}

const eventActionHandler: { [key: string]: (client: Client, message: EventBusMessage) => void } = {
	"create": actionCreate,
	"close": actionClose
};

export default {
	data: {
		name: "voting"
	},
	async handle(client: Client, message: EventBusMessage) {
		let eventAction = message.key.split(".")[2];
		if(!(eventAction in eventActionHandler)) {
			fmtLog("ERROR", `Event action: *${eventAction}* for event: *${message.key.split(".")[1]}* not found!`)
			return;
		}
		await eventActionHandler[eventAction](client, message);
	}
};
