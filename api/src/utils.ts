import crypto from "node:crypto";
import chalk from "chalk";
import { DateTime } from "luxon";

type LOG_TYPE = "INFO" | "WARN" | "ERROR";
function fmtLog(type: LOG_TYPE, message: string) {
	switch (type) {
		case "INFO":
			console.log(`${chalk.bold.blue(`[${new Date().toISOString()} | INFO]`)} ${message}`);
			break;

		case "WARN":
			console.log(`${chalk.bold.yellow(`[${new Date().toISOString()} | WARN]`)} ${message}`);
			break;

		case "ERROR":
			console.log(`${chalk.bold.red(`[${new Date().toISOString()} | ERROR]`)} ${message}`);
			break;

		default:
			break;
		}
}

function fingerprintGenerator() {
	let timestamp = parseInt((DateTime.utc().toUnixInteger() + "000")).toString(2);
	let salt = [...crypto.randomBytes(1)].map(x => x.toString(2).padStart(8, "0")).join("").substring(0, 7);
	return parseInt(timestamp + salt, 2);
}

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
