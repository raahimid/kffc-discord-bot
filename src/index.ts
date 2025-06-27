import 'dotenv/config';
import { Client, GatewayIntentBits, Interaction, Routes } from 'discord.js';
import { REST } from 'discord.js';
import { suggestBookCommand, executeSuggestBook } from './commands/suggestbook';
import { listBookSuggestionsCommand, executeListBookSuggestions } from './commands/listsuggestions';
import { removeBookSuggestionCommand, executeRemoveBookSuggestion } from './commands/removebooksuggestion';
import { currentReadCommand, executeCurrentRead } from './commands/currentread';
import { setCurrentReadCommand, executeSetCurrentRead } from './commands/setcurrentread';
import { pollBooksCommand, executePollBooks } from './commands/pollbooks';
import { endBookPollCommand, executeEndBookPoll } from './commands/endbookpoll';
import { rateBookCommand, executeRateBook } from './commands/ratebook';
import { readHistoryCommand, executeReadHistory } from './commands/readhistory';
import { topBooksCommand, executeTopBooks } from './commands/topbooks';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register commands with Discord API (do this on bot startup or separately)
async function registerCommands() {
  const commands = [
    suggestBookCommand.toJSON(),
    listBookSuggestionsCommand.toJSON(),
    removeBookSuggestionCommand.toJSON(),
    currentReadCommand.toJSON(),
    setCurrentReadCommand.toJSON(),
    pollBooksCommand.toJSON(),
    endBookPollCommand.toJSON(),
    rateBookCommand.toJSON(), // Register /ratebook
    readHistoryCommand.toJSON(), // Register /readhistory
    topBooksCommand.toJSON() // Register /topbooks
  ];
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
  } else if (interaction.commandName === 'listbooksuggestions') {
    await executeListBookSuggestions(interaction);
  } else if (interaction.commandName === 'removebooksuggestion') {
    await executeRemoveBookSuggestion(interaction);
  } else if (interaction.commandName === 'currentread') {
    await executeCurrentRead(interaction);
  } else if (interaction.commandName === 'setcurrentread') {
    await executeSetCurrentRead(interaction);
  } else if (interaction.commandName === 'pollbooks') {
    await executePollBooks(interaction);
  } else if (interaction.commandName === 'endbookpoll') {
    await executeEndBookPoll(interaction);
  } else if (interaction.commandName === 'ratebook') {
    await executeRateBook(interaction);
  } else if (interaction.commandName === 'readhistory') {
    await executeReadHistory(interaction);
  } else if (interaction.commandName === 'topbooks') {
    await executeTopBooks(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
