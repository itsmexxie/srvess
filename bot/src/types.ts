import { ChatInputCommandInteraction, Client } from "discord.js";
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

export {
	Event,
	EventBusMessage,
	Command
};
