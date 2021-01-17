// Features:
// auto eat
// auto equip totems
// going to home on death
// automatically sneak
// discord bot with commands
// in-game messages sent to discord
// discord messages in mc chat channel sent to minecraft

// To Do:
// performance monitoring like on https://analytics.switchcraft.pw/d/000000001/switchcraft-overview?orgId=1

// reading .env files which contains the token and stuff
require('dotenv').config();
const needle = require("needle"); // used for reading web pages

// Load discord
const Discord = require('discord.js'); // discord javascript api
const client = new Discord.Client();
const token = process.env.TOKEN;
let channel = process.env.MC_CHAT_CHANNEL;
let trustedChat = process.env.TRUSTED_CHAT_CHANNEL;
let trustedRole = process.env.TRUSTED_ROLE;

let trustedPlayers = ["Pqtato99","nedmac_exe","BandToaster20","percman","ZinTheNinja"]; // player names who are trusted

// Load mineflayer
const mineflayer = require('mineflayer'); // api for bots
const mineflayerViewer = require('prismarine-viewer').mineflayer; // viewer of bots view in browser
const autoeat = require('mineflayer-auto-eat'); // auto eat plugin
const bot = mineflayer.createBot({
	host: "mc.hauc3.gq",
	port: "25565",
	username: process.env.EMAIL,
	password: process.env.PASSWORD
});

// load auto eat plugin
bot.loadPlugin(autoeat);

bot.once('spawn', () => {
	// minecraft data
	const mcData = require('minecraft-data')(bot.version); // You will know the version when the bot has spawned
	const totemId = mcData.itemsByName.totem_of_undying.id; // Get the correct id

	// see the bots view in browser
	// http://localhost:3007 if on same device
	// http://<private ip>:3007 if on same network but not same device
	// http://<public ip>:3007 if on different network
	// if using ngrok use the link it gives
	mineflayerViewer(bot, { port: 3007, firstPerson: true });

	// auto eat settings
	bot.autoEat.options = {
		priority: 'foodPoints',
		startAt: 14,
		bannedFood: []
	};

	// if bot has totem of undying put it in off-hand
	if (mcData.itemsByName.totem_of_undying) {
		setInterval(() => {
			const totem = bot.inventory.findInventoryItem(totemId, null);
			if (totem) {
				bot.equip(totem, 'off-hand');
			}
		}, 50);
	}
});

// Enable or disable auto eat depending on hunger
bot.on('health', () => {
	if (bot.food === 20) bot.autoEat.disable()
	// Disable the plugin if the bot is at 20 food points
	else bot.autoEat.enable() // Else enable the plugin again
});

bot.on('death', () => {
	// Type /home home on death
	bot.chat("/home home");
});

bot.on('spawn', () => {
	// Sneak when respawned or logging in
	bot.setControlState("sneak", false);
	bot.setControlState("sneak", true);
});

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);

	// Get channels
	channel = client.channels.cache.get(channel);
	trustedChat = client.channels.cache.get(trustedChat);

	if (!channel) {
		console.log(`I could not find one of the channels`);
		process.exit(1);
	}
});

// Redirect Discord messages to in-game chat
client.on('message', message => {
	// Ignore messages from the bot itself
	if (message.author.id === client.user.id) return;
	
	// Commands
	if (message.content.startsWith(".")) {
		let command = message.content.substring(1).split(" ")[0];
		let args = (message.content.includes(" ")) ? message.content.substring(1).split(" ").slice(1) : [];
		switch (command) {
			case "ping":
				// ping command
				message.channel.send("Pong!");
				break;
			case "sneak":
				// sneak
				message.channel.send("ok");
				bot.setControlState("sneak", true);
				break;
			case "unsneak":
				// stop sneaking
				message.channel.send("ok");
				bot.setControlState("sneak", false);
				break;
			case "getcoords":
				// get coordinates only if in trusted chat and has trusted role
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

function handleChatMsg(username, message) {
	// Send to discord
	channel.send(`${username}: ${message}`);
}

async function goToSleep() {
	// Find nearest bed
	const bed = bot.findBlock({
		matching: block => bot.isABed(block)
	});

	// Detect if bed is valid
	if (bed) {
		bot.setControlState("sneak", false);
		// Try sleeping
		try {
			await bot.sleep(bed)
			bot.chat("Sleeping");
		} catch (err) {
			bot.chat(`I can't sleep: ${err.message}`);
		}
		bot.setControlState("sneak", true);
	} else {
		// If no bed is found
		bot.chat('No nearby bed');
	}
}

// Redirect in-game messages to Discord channel
bot.on('chat', (username, message) => {
	// Ignore messages from the bot itself
	if (username === bot.username) return;

	// Will be used eventually to detect if player is trusted
	let allowed = false;
	for (const i in trustedPlayers) {
		if (username == trustedPlayers[i]) allowed = true;
	}

	// Detect if message is sleep. If so the bot sleeps and if not sends the message to Discord.
	switch (message) {
		case 'sleep':
			goToSleep();
			break;
		default:
			handleChatMsg(username, message);
	}
});

// Login Discord bot
client.login(token);
