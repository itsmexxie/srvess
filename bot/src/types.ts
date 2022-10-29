import { ChatInputCommandInteraction } from "discord.js";

interface Command {
	data: {
		name: string,
		description: string
	},
	execute(interaction: ChatInputCommandInteraction): void;
};

export {
	Command
};
