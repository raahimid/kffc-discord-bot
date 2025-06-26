import { Client, GatewayIntentBits, Interaction, Routes } from 'discord.js';
import { REST } from 'discord.js';
import { suggestBookCommand, executeSuggestBook } from './commands/suggestbook';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register commands with Discord API (do this on bot startup or separately)
async function registerCommands() {
  const commands = [suggestBookCommand.toJSON()];
  if (!process.env.CLIENT_ID || !process.env.GUILD_ID || !process.env.DISCORD_TOKEN) {
    throw new Error('Missing env variables');
  }
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('Commands registered.');
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'suggestbook') {
    await executeSuggestBook(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
