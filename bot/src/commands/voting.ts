import { SlashCommandBuilder, ChatInputCommandInteraction, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { DateTime } from "luxon";
import DB from "../db.js";
import EventBus from "../eventbus.js";
import { fmtLog, fingerprintGenerator } from "../utils.js";

async function listSessions(interaction: ChatInputCommandInteraction) {
	// Query parameters
	const limit = 5;
	let currOffset = 0;

	// Create message function
	const createMessage = async () => {
		let totalSessions = await DB.votingSession.count({ where: { guildId: interaction.guildId as string, closed: interaction.options.getBoolean("closed") ? undefined : false }});
		let votingSessions = await DB.votingSession.findMany({
			where: { guildId: interaction.guildId as string, closed: interaction.options.getBoolean("closed") ? undefined : false },
			select: { id: true, number: true, question: true, closed: true },
			orderBy: { number: "asc" },
			skip: currOffset,
			take: limit
		});

		const embed = new EmbedBuilder()
			.setTitle("📊 Voting sessions")
			.setDescription(votingSessions.length == 0 ? "There are no previous voting sessions with the matching criteria! :(" : (votingSessions.length == 1 ? "This is the latest voting session:" : `These are the previous ${votingSessions.length} voting sessions:`))
			.setColor(0x00AAFF)
		for(const session of votingSessions) {
			embed.addFields({ name: `Voting #${session.number} | ${session.closed ? "CLOSED" : "ONGOING"}`, value: session.question })
		}

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents([
			new ButtonBuilder()
				.setCustomId("prev").setLabel("Previous").setStyle(ButtonStyle.Primary).setDisabled(currOffset > 0 ? false : true),
			new ButtonBuilder()
				.setCustomId("next").setLabel("Next").setStyle(ButtonStyle.Primary).setDisabled((currOffset + limit) < totalSessions ? false : true)
		]);

		return { embeds: [embed], components: [buttons] };
	};

	const message = await interaction.reply(await createMessage());
	const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

	collector.on("collect", async (i) => {
		if(i.user.id != interaction.user.id) {
			await i.reply({ content: "These buttons aren't for you >:(!", ephemeral: true });
			return;
		}
		switch(i.customId) {
			case "prev":
				currOffset -= limit;
				break;
			case "next":
				currOffset += limit;
				break;
		}

		i.update(await createMessage());
	});
}

async function sessionInfo(interaction: ChatInputCommandInteraction) {
	// Get guild info
	let guild = (await DB.guild.findUnique({ where: { id: interaction.guildId as string } }))!;

	// Get session info
	let votingSession = await DB.votingSession.findFirst({
		where: { guildId: interaction.guildId as string, number: interaction.options.getInteger("session-number") as number },
		include: { options: true }
	});
	if(!votingSession) return await interaction.reply({ content: `Didn't find voting session **#${interaction.options.getInteger("session-number")}**!`, ephemeral: true });

	// Create message
	const embed = new EmbedBuilder()
		.setTitle(`Voting #${votingSession.number} | INFO`)
		.setColor(0x00AAFF)
		.addFields([
			{ name: "Question:", value: votingSession.question },
			{ name: "Open?", value: votingSession.closed ? "❎" : "✅", inline: true },
			{ name: "Created at:", value: DateTime.fromMillis(parseInt(votingSession.createdAtTimestamp), { zone: guild.timezone }).toFormat("MMMM dd, yyyy - HH:mm"), inline: true },
			{ name: votingSession.closed ? "Ended at:" : "Ends at:", value: DateTime.fromMillis(parseInt(votingSession.endsAtTimestamp), { zone: guild?.timezone }).toFormat("MMMM dd, yyyy - HH:mm"), inline: true }
		]);
	let optionsString = "";
	if(votingSession.closed) {
		let totalVotes = await DB.vote.count({ where: { votingSessionId: votingSession.id } });
		for(let i = 0; i < votingSession.options.length; i++) {
			let optionVotes = await DB.vote.count({ where: { votingSessionId: votingSession.id, votingOptionId: votingSession.options[i].id } });
			optionsString += `${JSON.parse(guild.votingGlyphs)[votingSession.type][i]} **${votingSession.options[i].content}** - ${optionVotes} (${totalVotes > 0 ? ((optionVotes / totalVotes) * 100).toPrecision(3) : 0}%)`;
			if(i != (votingSession.options.length - 1)) optionsString += "\n";
		}
		embed.setFooter({ text: "Wait for the session to close to see the results!"});
	} else {
		for(let i = 0; i < votingSession.options.length; i++) {
			optionsString += `${JSON.parse(guild.votingGlyphs)[votingSession.type][i]} **${votingSession.options[i].content}**`;
			if(i != (votingSession.options.length - 1)) optionsString += "\n";
		}
	}
	embed.addFields({ name: "Options:", value: optionsString });

	await interaction.reply({ embeds: [embed] });
}

async function createSession(interaction: ChatInputCommandInteraction, eventbus: EventBus) {
	// Get guild info
	let guild = (await DB.guild.findUnique({ where: { id: interaction.guildId as string } }))!;

	// Check parameters
	const requiredOptionsLength = [2, 0][parseInt(interaction.options.getString("type") as string)];
	const rawOptions = (interaction.options.getString("options") as string).split(";;");
	if(requiredOptionsLength != 0 && rawOptions.length != requiredOptionsLength) return await interaction.reply({ content: `Not enough options for the selected type! (Need ${requiredOptionsLength})`, ephemeral: true });

	// Check endsAtTimestamp
	let endsAtDate = DateTime.fromISO(interaction.options.getString("ends-at-timestamp") as string, { zone: guild?.timezone });
	if(!endsAtDate.isValid) return await interaction.reply({ content: "Invalid date and/or time!", ephemeral: true });
	if(endsAtDate.diff(DateTime.now()).toMillis() < 0) return await interaction.reply({ content: "Invalid date and/or time!", ephemeral: true });
	if(interaction.options.getString("ends-at-timestamp")?.split("T").length == 1) endsAtDate = endsAtDate.set({ hour: 12, minute: 0, millisecond: 0 });
	else endsAtDate = endsAtDate.set({ minute: 0, millisecond: 0 });

	// * ===== Create new voting session =====
	const newSessionId = fingerprintGenerator().toString();
	// Create new options for the voting session
	const newOptions = [];
	for(let i = 0; i < rawOptions.length; i++) {
		newOptions.push({
			id: fingerprintGenerator().toString(),
			index: i,
			content: rawOptions[i],
		});
	}

	// Create the session itself
	const newSession = await DB.votingSession.create({
		data: {
			id: newSessionId,
			number: (await DB.votingSession.count({ where: { guildId: interaction.guildId as string } })) + 1,
			type: parseInt(interaction.options.getString("type") as string),
			question: interaction.options.getString("name") as string,
			options: { create: newOptions },
			closed: false,
			createdAtTimestamp: DateTime.now().toMillis().toString(),
			endsAtTimestamp: endsAtDate.toMillis().toString(),
			guildId: interaction.guildId as string
		},
		include: {
			options: true
		}
	});

	// Signal to event bus
	eventbus.publish("voting.create", JSON.stringify(newSession));

	// Reply to original interaction
	await interaction.reply(`Successfully created a new voting session **#${newSession.number}**!`);
}

async function closeSession(interaction: ChatInputCommandInteraction) {
	// Find the target session and test if it's not already closed
	const targetSession = await DB.votingSession.findFirst({
		where: { guildId: interaction.guildId as string, number: interaction.options.getInteger("session-number") as number  }
	});
	if(!targetSession) return await interaction.reply({ content: `Didn't find voting session **#${interaction.options.getInteger("session-number")}**!`, ephemeral: true });
	if(targetSession.closed) return await interaction.reply({ content: `Voting session **#${targetSession.number}** is already closed!`, ephemeral: true });

	// Close the voting session
	await DB.votingSession.update({
		where: { id: targetSession.id },
		data: { closed: true }
	});

	await interaction.reply(`Successfully closed voting session **#${targetSession.number}**!`);
}

async function deleteSession(interaction: ChatInputCommandInteraction) {
	// Find the target session and test if it's not already closed
	const targetSession = await DB.votingSession.findFirst({
		where: { guildId: interaction.guildId as string, number: interaction.options.getInteger("session-number") as number  }
	});
	if(!targetSession) return await interaction.reply({ content: `Didn't find a voting session **#${interaction.options.getInteger("session-number")}**!`, ephemeral: true });

	// Delete the voting session
	await DB.votingSession.delete({
		where: { id: targetSession.id }
	});

	await interaction.reply(`Successfully deleted voting session **#${targetSession.number}**!`);
}

const subcommandHandler: { [key: string]: (interaction: ChatInputCommandInteraction, eventbus: EventBus) => void } = {
	"list": listSessions,
	"info": sessionInfo,
	"create": createSession,
	"close": closeSession,
	"delete": deleteSession
}

export default {
	data: new SlashCommandBuilder()
		.setName("voting")
		.setDescription("Manages voting.")
		.addSubcommand(subcommand => subcommand
			.setName("list")
			.setDescription("Lists voting sessions. (Currently ongoing only by default).")
			.addBooleanOption(option => option.setName("closed").setDescription("Also list previous and closed voting sessions.")))
		.addSubcommand(subcommand => subcommand
			.setName("info")
			.setDescription("Gets the info about a specific voting session.")
			.addIntegerOption(option => option.setName("session-number").setDescription("Specify the voting session id.").setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName("create")
			.setDescription("Create a new voting session.")
			.addStringOption(option => option.setName("type").setDescription("Voting session type.").addChoices({ name: "Yes/No", value: "0" }, { name: "Multichoice", value: "1" }).setRequired(true))
			.addStringOption(option => option.setName("name").setDescription("Voting session name.").setRequired(true))
			.addStringOption(option => option.setName("options").setDescription("Voting session options. Split options by ;;.").setRequired(true))
			.addStringOption(option => option.setName("ends-at-timestamp").setDescription("Ends at date/time (ISO string).").setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName("close")
			.setDescription("Close an ongoing voting session.")
			.addIntegerOption(option => option.setName("session-number").setDescription("The number of the voting session to close.").setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName("delete")
			.setDescription("Delete an ongoing voting session.")
			.addIntegerOption(option => option.setName("session-number").setDescription("The number of the voting session to delete.").setRequired(true))),
	async execute(interaction: ChatInputCommandInteraction, eventbus: EventBus) {
		let subcommand = interaction.options.getSubcommand();
		if(!(subcommand in subcommandHandler)) {
			fmtLog("ERROR", `Sub-command ${subcommand} for command ${interaction.commandName} not found!`);
			await interaction.reply({ content: "Unknown sub-command!", ephemeral: true });
			return;
		}
		await subcommandHandler[subcommand](interaction, eventbus);
	}
};
