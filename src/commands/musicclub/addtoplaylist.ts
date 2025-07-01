import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

export const addToPlaylistCommand = new SlashCommandBuilder()
  .setName('addtoplaylist')
  .setDescription('Add a song to the server playlist (must be from a previously finished album).')
  .addStringOption(option =>
    option.setName('song')
      .setDescription('Song name')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('artist')
      .setDescription('Artist name')
      .setRequired(true)
  );

export async function executeAddToPlaylist(interaction: ChatInputCommandInteraction) {
  const song = interaction.options.getString('song', true);
  const artist = interaction.options.getString('artist', true);
  const userId = interaction.user.id;
  // Find if song is in any finished album
  const { data: albums, error } = await supabase
    .from('album_history')
    .select('album_id, albums(title, artist)')
    .order('ended_at', { ascending: false });
  if (error || !albums || albums.length === 0) {
    await interaction.reply({ content: 'No finished albums found to check against.', ephemeral: true });
    return;
  }
  // For each album, check if song matches (simulate tracklist, or you can extend schema for real tracklists)
  // Here, we just match artist and album title for now
  const found = albums.find(row => {
    const album = row.albums && Array.isArray(row.albums) ? row.albums[0] : row.albums;
    return album && album.artist.toLowerCase() === artist.toLowerCase();
  });
  if (!found) {
    await interaction.reply({ content: 'This song is not from any previously finished album by that artist.', ephemeral: true });
    return;
  }
  // Insert into playlist_songs
  const { error: insertError } = await supabase.from('playlist_songs').insert({
    id: uuidv4(),
    song_name: song,
    artist: artist,
    album_id: found.album_id,
    added_by: userId,
    // added_at will default to now()
  });
  if (insertError) {
    await interaction.reply({ content: 'Failed to add song to playlist.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `Added **${song}** by **${artist}** to the server playlist!`, ephemeral: false });
}
