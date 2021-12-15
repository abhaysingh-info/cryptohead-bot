const Discord = require('discord.js');
const config = require('./data/config.json');
const commands = require('./data/commands.json');
const utils = require('./utils/utils');

const client = new Discord.Client();

client.on('ready', async () => {
	const api = 'https://api.coingecko.com/api/v3/';

	utils.message(client, 'help', async (message) => {
		let output = utils.replaceAuthor(
			message.author,
			commands['help']['output']
		);
		output = output.replace(/\<help\>/g, utils.help(commands));
		message.channel.send(output);
	});

	utils.message(client, 'description', async (message) => {
		utils.description(message, commands, api);
	});

	utils.message(client, 'feeling', async (message) => {
		utils.feeling(message, commands, api, 2);
	});

	utils.message(client, 'trending', async (message) => {
		utils.trending(message, commands, api, 1);
	});

	// utils.message(client, 'chart', async (message) => {
	// 	utils.chart(message, commands, api, 2, config.domain);
	// });

	utils.message(client, 'events', async (message) => {
		utils.events(message, commands, api, 1);
	});

	utils.message(client, 'price', async (message) => {
		utils.price(message, commands, api, 2);
	});

	utils.message(client, 'market', async (message) => {
		utils.market(message, commands, api, 1);
	});

	utils.message(client, 'shares', async (message) => {
		utils.shares(message, commands, api, 1);
	});

	utils.message(client, ['show', 'info'], async (message) => {
		utils.showInfo(message, commands, api, 2);
	});
});

if (config.token) {
	client.login(config.token);
} else {
	client.login(process.env.DISCORD_KEY);
}

// "chart": {
//         "usage": "chart <coin>",
//         "what": "To get visual data of a coin in last 24 hours. usage : $chart btc",
//         "output": "<author>, this might help you with <coin_name> (<coin_symbol>)\nVisit : <url>",
//         "scope": [
//             "<author>",
//             "<coin_name>",
//             "<coin_symbol>",
//             "<url>"
//         ]
//     },
