import { ButtonInteraction, ChatInputCommandInteraction, Client, Collection } from "discord.js";

interface Command {
	data: {
		name: string,
		description: string
	},
	execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

interface Interaction {
	data: {
		type: string
	},
	handle(interaction: ChatInputCommandInteraction | ButtonInteraction, client: Client, commands?: Collection<string, Command>): Promise<void>
}

export {
	Command,
	Interaction
};
