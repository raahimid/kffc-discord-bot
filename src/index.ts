import 'dotenv/config';
import { Client, GatewayIntentBits, Interaction, Routes } from 'discord.js';
import { REST } from 'discord.js';
import { suggestBookCommand, executeSuggestBook } from './commands/bookclub/suggestbook';
import { listBookSuggestionsCommand, executeListBookSuggestions } from './commands/bookclub/listsuggestions';
import { removeBookSuggestionCommand, executeRemoveBookSuggestion } from './commands/bookclub/removebooksuggestion';
import { currentReadCommand, executeCurrentRead } from './commands/admin/currentread';
import { setCurrentReadCommand, executeSetCurrentRead } from './commands/admin/setcurrentread';
import { pollBooksCommand, executePollBooks } from './commands/admin/pollbooks';
import { endBookPollCommand, executeEndBookPoll } from './commands/admin/endbookpoll';
import { rateBookCommand, executeRateBook } from './commands/bookclub/ratebook';
import { readHistoryCommand, executeReadHistory } from './commands/bookclub/readhistory';
import { topBooksCommand, executeTopBooks } from './commands/bookclub/topbooks';
import { syncAudiophileRotation } from './commands/musicclub/syncAudiophileRotation';
import { suggestAlbumCommand, executeSuggestAlbum } from './commands/musicclub/suggestalbum';
import { currentAlbumCommand, executeCurrentAlbum } from './commands/musicclub/currentalbum';
import { albumHistoryCommand, executeAlbumHistory } from './commands/musicclub/albumhistory';
import { finishAlbumCommand, executeFinishAlbum } from './commands/admin/finishalbum';
import { rateAlbumCommand, executeRateAlbum } from './commands/musicclub/ratealbum';
import { topAlbumsCommand, executeTopAlbums } from './commands/musicclub/topalbums';
import { skipTurnCommand, executeSkipTurn } from './commands/admin/skipturn';
import { nextPickerCommand, executeNextPicker } from './commands/admin/nextpicker';
import { bookInfoCommand, executeBookInfo } from './commands/bookclub/bookinfo';
import { serverPlaylistCommand, executeServerPlaylist } from './commands/musicclub/serverplaylist';
import { addToPlaylistCommand, executeAddToPlaylist } from './commands/musicclub/addtoplaylist';
import { endCurrentReadCommand, executeEndCurrentRead } from './commands/admin/endcurrentread';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
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
    topBooksCommand.toJSON(), // Register /topbooks
    suggestAlbumCommand.toJSON(), // Register /suggestalbum
    currentAlbumCommand.toJSON(), // Register /currentalbum
    albumHistoryCommand.toJSON(), // Register /albumhistory
    finishAlbumCommand.toJSON(), // Register /finishalbum
    rateAlbumCommand.toJSON(), // Register /ratealbum
    topAlbumsCommand.toJSON(), // Register /topalbums
    skipTurnCommand.toJSON(), // Register /skipturn
    nextPickerCommand.toJSON(), // Register /nextpicker
    bookInfoCommand.toJSON(), // Register /bookinfo
    serverPlaylistCommand.toJSON(), // Register /serverplaylist
    addToPlaylistCommand.toJSON(), // Register /addtoplaylist
    endCurrentReadCommand.toJSON() // Register /endcurrentread
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
  await syncAudiophileRotation(client);
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
  } else if (interaction.commandName === 'suggestalbum') {
    await executeSuggestAlbum(interaction);
  } else if (interaction.commandName === 'currentalbum') {
    await executeCurrentAlbum(interaction);
  } else if (interaction.commandName === 'albumhistory') {
    await executeAlbumHistory(interaction);
  } else if (interaction.commandName === 'finishalbum') {
    await executeFinishAlbum(interaction);
  } else if (interaction.commandName === 'ratealbum') {
    await executeRateAlbum(interaction);
  } else if (interaction.commandName === 'topalbums') {
    await executeTopAlbums(interaction);
  } else if (interaction.commandName === 'skipturn') {
    await executeSkipTurn(interaction);
  } else if (interaction.commandName === 'nextpicker') {
    await executeNextPicker(interaction);
  } else if (interaction.commandName === 'bookinfo') {
    await executeBookInfo(interaction);
  } else if (interaction.commandName === 'serverplaylist') {
    await executeServerPlaylist(interaction);
  } else if (interaction.commandName === 'addtoplaylist') {
    await executeAddToPlaylist(interaction);
  } else if (interaction.commandName === 'endcurrentread') {
    await executeEndCurrentRead(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
