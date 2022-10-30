import { ChatInputCommandInteraction } from "discord.js";

interface Command {
	data: {
		name: string,
		description: string
	},
	execute(interaction: ChatInputCommandInteraction): void;
};

interface VotingSession {
	id: string,
	number: number
	type: number,
	name: string,
	closed: boolean
	createdAtTimestamp: string,
	endsAtTimestamp: string,
	guildId: string
}

interface VotingOption {
	id: string,
	index: number,
	content: string,
	sessionId: string
}

export {
	Command,
	VotingSession,
	VotingOption
};
