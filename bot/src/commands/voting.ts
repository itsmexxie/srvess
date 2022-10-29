import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { fmtLog } from "../utils.js";

async function listSessions(interaction: ChatInputCommandInteraction) {
}

async function sessionInfo(interaction: ChatInputCommandInteraction) {
}

async function createSession(interaction: ChatInputCommandInteraction) {
}

async function closeSession(interaction: ChatInputCommandInteraction) {
}

async function deleteSession(interaction: ChatInputCommandInteraction) {
}

const subcommandHandler: { [key: string]: (interaction: ChatInputCommandInteraction) => void } = {
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
			.addStringOption(option => option.setName("type").setDescription("Voting session type.").addChoices({ name: "Yes/No", value: "0" }, { name: "Muti-choice", value: "1" }).setRequired(true))
			.addStringOption(option => option.setName("name").setDescription("Voting session name.").setRequired(true))
			.addStringOption(option => option.setName("options").setDescription("Voting session options. Split options by ;;.").setRequired(true))
			.addStringOption(option => option.setName("ends-at-timestamp").setDescription("Ends at date/time (ISO string).").setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName("close")
			.setDescription("Closs an ongoing voting session."))
		.addSubcommand(subcommand => subcommand
			.setName("delete")
			.setDescription("Delete an ongoing voting session.")),
	async execute(interaction: ChatInputCommandInteraction) {
		let subcommand = interaction.options.getSubcommand();
		if(!(subcommand in subcommandHandler)) {
			fmtLog("WARN", `Sub-command ${subcommand} for command ${interaction.commandName} not found!`);
			await interaction.reply({ content: "Unknown sub-command!", ephemeral: true });
			return;
		}
		await subcommandHandler[subcommand](interaction);
	}
};
