import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Prints the current ping."),
	async execute(interaction: ChatInputCommandInteraction) {
		const embed = new EmbedBuilder()
			.setColor(0x00AAFF)
			.setTitle("🏓 Pong!")
			.setDescription(`The current ping is ${Date.now() - interaction.createdTimestamp}ms!`);

		await interaction.reply({ embeds: [embed] });
	}
};
