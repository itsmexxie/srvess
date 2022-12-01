import EventBus from "./eventbus.js";

interface Event {
	data: {
		name: string
	},
	handle(message: EventBusMessage): Promise<void>
}

interface EventBusMessage {
	key: string,
	content: any
}

export {
	Event,
	EventBusMessage
};
