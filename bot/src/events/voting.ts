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
		.setTitle(`Voting #${message.content.number}`)
		.setColor(0x00AAFF)
		.addFields({ name: "Question:", value: message.content.question })
		.setFooter({ text: `Ends at ${DateTime.fromMillis(parseInt(message.content.endsAtTimestamp), { zone: guild.timezone }).toFormat("MMMM dd, yyyy - HH:mm")}` });
	const buttons = new ActionRowBuilder<ButtonBuilder>();

	let optionsString = "";
	for(let i = 0; i < message.content.options.length; i++) {
		let votingGlyph = JSON.parse(guild.votingGlyphs)[message.content.type][i];

		optionsString += `${votingGlyph} **${message.content.options[i].content}**`;
		if(i != (message.content.options.length - 1)) optionsString += "\n";

		buttons.addComponents(new ButtonBuilder()
			.setCustomId(`voting-${message.content.id}-${message.content.options[i].id}`)
			.setLabel(message.content.options[i].content)
			.setEmoji(votingGlyph)
			.setStyle(ButtonStyle.Primary));
	}
	embed.addFields({ name: "Options:", value: optionsString });

	// Get voting channel and send the embed
	const votingChannel = (client.guilds.cache.get(guild.id)?.channels.cache.get(guild.votingChannelId) as TextChannel) || client.guilds.cache.get(guild.id)?.systemChannel;
	votingChannel.send({ embeds: [embed], components: [buttons] });
}

async function actionClose(client: Client, message: EventBusMessage) {
	// Get voting session and guild info
	const votingSession = (await DB.votingSession.findUnique({ where: { id: message.content.id } }))!;
	const guild = (await DB.guild.findUnique({ where: { id: votingSession.guildId } }))!;

	// Close the voting session
	DB.votingSession.update({ where: { id: votingSession.id }, data: { closed: true } });

	// Create the voting results embed
	const embed = new EmbedBuilder()
		.setTitle(`Voting #${votingSession.number} | RESULTS`)
		.setColor(0x00FF00);

	// Send the voting results embed
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
