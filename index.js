require('dotenv').config();
const needle = require("needle");

// Load discord
const Discord = require('discord.js');
const client = new Discord.Client();
const token = process.env.TOKEN;
let channel = process.env.MC_CHAT_CHANNEL;
let alertsChannel = process.env.ALERTS_CHANNEL;
let trustedChat = process.env.TRUSTED_CHAT_CHANNEL;
let trustedRole = process.env.TRUSTED_ROLE;

let players = [];
let alertPlayers = ["9a311cfb-3d9f-4ff8-ad1e-e0514a163de9"];
let alertPlayersFound = [];

// Load mineflayer
const mineflayer = require('mineflayer');
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const bot = mineflayer.createBot({
	host: "mc.hauc3.gq",
	port: "25565",
	username: process.env.EMAIL,
	password: process.env.PASSWORD
});

bot.once('spawn', () => {
	mineflayerViewer(bot, { port: 3007, firstPerson: true });
	bot.setControlState("sneak", true);
	bot.look(0, 0);
});

/* bot.once('kicked', () => {
	process.exit(1);
}); */

function sendAlert(player) {
	alertsChannel.send("@everyone **ALERT** `" + player.username + "` has been found near the bot");
}

setInterval(function() {
	let temp = Array.from(alertPlayersFound);
	players = [];
	var x;
	for (const i in bot.entities) {
		x = bot.entities[i];
		if (x.type.toString() == "player") {
			if (x.username != undefined && x.username != bot.player.username) {
				players.push({
					username: x.username,
					uuid: (x.uuid != null) ? x.uuid : ""
				});
			}
		}
	}
	for (const i in alertPlayers) {
		x = alertPlayers[i];
		for (const y in players) {
			if (players[y].uuid.toString() == x.toString()) {
				let f = {
					username: players[y].username,
					uuid: players[y].uuid
				};
				if (alertPlayersFound.toString().includes(f.toString()) != true) alertPlayersFound.push(f);
			}
		}
	}
	for (const i in alertPlayersFound) {
		if (temp.toString().includes(alertPlayersFound[i].toString()) != true) {
			for (const x in alertPlayersFound) {
				sendAlert(alertPlayersFound[x]);
			}
			break;
		}
	}
}, 5000);

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	channel = client.channels.cache.get(channel);
	alertsChannel = client.channels.cache.get(alertsChannel);
	trustedChat = client.channels.cache.get(trustedChat);
	if (!channel) {
		console.log(`I could not find the channel`);
		process.exit(1);
	}
});

// Redirect Discord messages to in-game chat
client.on('message', message => {
	// Ignore messages from the bot itself
	if (message.author.id === client.user.id) return;
	
	if (message.content.startsWith(".")) {
		let command = message.content.substring(1).split(" ")[0];
		let args = (message.content.includes(" ")) ? message.content.substring(1).split(" ").slice(1) : [];
		switch (command) {
			case "ping":
				message.channel.send("Pong!");
				break;
			case "sneak":
				message.channel.send("ok");
				bot.setControlState("sneak", true);
				break;
			case "unsneak":
				message.channel.send("ok");
				bot.setControlState("sneak", false);
				break;
			case "getcoords":
				if (message.channel.id !== trustedChat.id) {
					message.channel.send("This command is only allowed in <#" + trustedChat.id + ">");
					break;
				}
				if (message.member.roles.cache.has(trustedRole) != true) {
					message.channel.send("This command is only allowed if you have the trusted role");
					break;
				}
				message.channel.send(`The bot coordinates are ||${bot.entity.position['x']} ${bot.entity.position['y']} ${bot.entity.position['z']}||`)
				break;
			default:
				message.channel.send("Unknown command. Commands: ping, sneak, unsneak, getcoords");
		}
		return;
	}
	
	// Only handle messages in specified channel
	if (message.channel.id !== channel.id) return;

	bot.chat(message.content.toString());
});

// Redirect in-game messages to Discord channel
bot.on('chat', (username, message) => {
	// Ignore messages from the bot itself
	if (username === bot.username) return;

	channel.send(`${username}: ${message}`);
});

// Login Discord bot
client.login(token);