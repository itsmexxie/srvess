import { Client, ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import EventBus from "./eventbus.js";

interface Event {
	data: {
		name: string
	},
	handle(client: Client, message: EventBusMessage): Promise<void>
}

interface EventBusMessage {
	key: string,
	content: any
}

interface Command {
	data: {
		name: string,
		description: string
	},
	execute(interaction: ChatInputCommandInteraction, eventbus: EventBus): Promise<void>
};

interface Interaction {
	data: {
		type: string
	},
	handle(interaction: ChatInputCommandInteraction | ButtonInteraction, eventbus: EventBus): Promise<void>
}

export {
	Event,
	EventBusMessage,
	Command,
	Interaction
};
