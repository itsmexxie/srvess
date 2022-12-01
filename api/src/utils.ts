import crypto from "node:crypto";
import chalk from "chalk";

// * ===== FORMAT LOGGING =====
type LOG_TYPE = "INFO" | "WARN" | "ERROR";

function messageFormatter(message: string): string {
	// Bold text
	if(message.replace) {
		message = message.replace(/(?<!\\)\*{2}([^\*]+)(?<!\\)\*{2}/g, `${chalk.bold("$1")}`);
		message = message.replace(/(?<!\\)\*{1}([^\*]+)(?<!\\)\*{1}/g, `${chalk.italic("$1")}`);
	}
	return message;
}

function fmtLog(type: LOG_TYPE, message: string) {
	switch(type) {
		case "INFO":
			console.log(`${chalk.bold.blue(`[${new Date().toISOString()} | ${type}]`)} ${messageFormatter(message)}`);
			break;
		case "WARN":
			console.log(`${chalk.bold.yellow(`[${new Date().toISOString()} | ${type}]`)} ${messageFormatter(message)}`);
			break;
		case "ERROR":
			console.log(`${chalk.bold.red(`[${new Date().toISOString()} | ${type}]`)} ${messageFormatter(message)}`);
			break;
	}
}

// * ===== FINGERPRINT GENERATOR =====
function fingerprintGenerator() {
	let timestamp = new Date().getTime().toString(2);
	let salt = [...crypto.randomBytes(1)].map(x => x.toString(2).padStart(8, "0")).join("").substring(0, 7);
	return parseInt(timestamp + salt, 2);
}

// * ===== IS BETWEEN =====
function isBetween(number: number, lowest: number, highest: number) {
	if(lowest <= number && number <= highest) return true;
	return false;
}

export default {
	fmtLog,
	fingerprintGenerator,
	isBetween
};

export {
	fmtLog,
	fingerprintGenerator,
	isBetween
};
