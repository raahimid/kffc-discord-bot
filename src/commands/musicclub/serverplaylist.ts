import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { supabase } from '../../utils/supabase';
import process from 'process';

export const serverPlaylistCommand = new SlashCommandBuilder()
  .setName('serverplaylist')
  .setDescription('Display the ongoing server playlist for the music club.');

const PAGE_SIZE = 10;

const SPOTIFY_PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID;
const APPLE_MUSIC_PLAYLIST_URL = process.env.APPLE_MUSIC_PLAYLIST_URL;

export async function executeServerPlaylist(interaction: ChatInputCommandInteraction) {
  const { data: songs, error } = await supabase
    .from('playlist_songs')
    .select('song_name, artist, album_id, added_by, added_at, albums(title, artist)')
    .order('added_at', { ascending: true });
  if (error || !songs || songs.length === 0) {
    await interaction.reply({ content: 'The server playlist is currently empty.', ephemeral: true });
    return;
  }
  let page = 0;
  const maxPage = Math.ceil(songs.length / PAGE_SIZE) - 1;
  const getEmbed = (page: number) => {
    const chunk = songs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const embed = new EmbedBuilder()
      .setTitle('🎶 Server Playlist')
      .setDescription(
        `<:spotify:1389450918164172890> [Spotify Playlist](https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID})\n` +
        `<:applemusic:1389450858034626560> [Apple Music Playlist](${APPLE_MUSIC_PLAYLIST_URL})\n\n` +
        'Tracks added via `/addtoplaylist` are automatically synced to the Spotify playlist.\n' +
        'The Apple Music playlist is updated manually by admins to mirror Spotify.' +
        '\n\nSongs added by the community:'
      )
      .setColor(0x1DB954);
      // Helper to title case a string
      function toTitleCase(str: string) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }
      chunk.forEach((row, idx) => {
        const album = row.albums && Array.isArray(row.albums) ? row.albums[0] : row.albums;
        embed.addFields({
          name: `Song: ${toTitleCase(row.song_name)}`,
          value: `Album: ${album ? `${album.title} by ${album.artist}` : 'Unknown'}\nAdded by: <@${row.added_by}>\nAdded: <t:${Math.floor(new Date(row.added_at).getTime() / 1000)}:f>`
        });
      });
    embed.setFooter({ text: `Page ${page + 1} of ${maxPage + 1}` });
    return embed;
  };
  const getRow = (page: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === maxPage)
  );
  const reply = await interaction.reply({
    embeds: [getEmbed(page)],
    components: [getRow(page)],
    ephemeral: true
  });
  if (maxPage === 0) return;
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });
  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'Only the command user can change pages.', ephemeral: true });
      return;
    }
    if (i.customId === 'prev' && page > 0) page--;
    if (i.customId === 'next' && page < maxPage) page++;
    await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
  });
  collector.on('end', async () => {
    await reply.edit({ components: [getRow(page).setComponents(
      ...getRow(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    )] });
  });
}
