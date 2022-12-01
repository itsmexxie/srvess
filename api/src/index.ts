// Initialize environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Import modules
import express from "express";
import bodyParser from "body-parser";
import { Settings as LuxonSettings } from "luxon";
import DB from "./db.js";
import { fmtLog } from "./utils.js";

// Set default timezone to UTC
LuxonSettings.defaultZone = "UTC";

// *** EXPRESS ***
const app = express();
app.use(bodyParser.json());

// Logger
app.use((req, res, next) => {
	fmtLog("INFO", `Incoming ${req.method} request to ${req.path} with params: ${JSON.stringify(req.query)} and body: ${JSON.stringify(req.body)}`);
	next();
});

// Index route
app.get("/", (req, res) => {
	res.send("Welcome to SrvEss's API!");
});

// Listen on PORT
app.listen(process.env.API_PORT, () => {
	fmtLog("INFO", `Listening on port ${process.env.API_PORT}...`);
});
