import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';
import { searchSpotifyAlbum } from '../../utils/spotify';

export const suggestAlbumCommand = new SlashCommandBuilder()
  .setName('suggestalbum')
  .setDescription('Suggest the next album for the music club (Audiophile role only, in rotation order)')
  .addStringOption(option =>
    option.setName('album')
      .setDescription('Album name')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('artist')
      .setDescription('Artist name (optional)')
      .setRequired(false)
  );

export async function executeSuggestAlbum(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }
  const audiophileRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'audiophile');
  if (!audiophileRole) {
    await interaction.reply({ content: 'Could not find the @Audiophile role in this server.', ephemeral: true });
    return;
  }
  // Get all Audiophile members
  const members = audiophileRole.members.map(m => m.user.id);
  if (!members.includes(userId)) {
    await interaction.reply({ content: 'You must have the @Audiophile role to suggest an album.', ephemeral: true });
    return;
  }
  // Sync: Insert only missing users
  const { data: existingRows, error: fetchError } = await supabase.from('musicclub_rotation').select('user_id');
  if (fetchError) {
    await interaction.reply({ content: 'Error fetching rotation data.', ephemeral: true });
    return;
  }
  const existingIds = existingRows?.map(r => r.user_id) ?? [];
  const newIds = members.filter(id => !existingIds.includes(id));
  if (newIds.length > 0) {
    const insertResult = await supabase.from('musicclub_rotation').insert(newIds.map(id => ({ user_id: id, pick_count: 0 })));
    if (insertResult.error) {
      await interaction.reply({ content: 'Error syncing rotation table.', ephemeral: true });
      return;
    }
  }
  // Fetch all Audiophile users in rotation
  const { data: rotation, error: selectError } = await supabase
    .from('musicclub_rotation')
    .select('user_id, pick_count')
    .in('user_id', members);
  if (selectError || !rotation || rotation.length === 0) {
    await interaction.reply({ content: 'Error fetching rotation data or no Audiophile members found.', ephemeral: true });
    return;
  }
  // Sort by pick_count ASC, then user_id ASC
  rotation.sort((a, b) => {
    if (a.pick_count !== b.pick_count) return a.pick_count - b.pick_count;
    return a.user_id.localeCompare(b.user_id);
  });
  const nextPicker = rotation[0];
  if (nextPicker.user_id !== userId) {
    await interaction.reply({ content: `It’s not your turn to pick an album. Next up: <@${nextPicker.user_id}>`, ephemeral: true });
    return;
  }
  // Before allowing suggestion, check if there is an active current_album
  const { data: currentAlbum, error: currentAlbumFetchError } = await supabase.from('current_album').select('*').single();
  if (!currentAlbumFetchError && currentAlbum) {
    await interaction.reply({ content: 'There is already an active album round! Please finish the current album before suggesting a new one.', ephemeral: true });
    return;
  }
  // Get parameters from command
  const album = interaction.options.getString('album', true);
  const artist = interaction.options.getString('artist', false) || undefined;
  // Validate album with Spotify
  const spotifyAlbum = await searchSpotifyAlbum(album, artist);
  if (!spotifyAlbum) {
    await interaction.reply({ content: `❌ Could not find that album. Please double-check spelling.`, ephemeral: true });
    return;
  }
  // Check if album already exists in albums table (by spotify_album_id)
  const { data: existingAlbum, error: existingAlbumError } = await supabase.from('albums').select('*').eq('spotify_album_id', spotifyAlbum.id).single();
  if (existingAlbum && !existingAlbumError) {
    await interaction.reply({ content: `❌ This album has already been picked before for music club! Please choose a different album.`, ephemeral: true });
    return;
  }
  // Upsert into albums table
  const { data: albumRow, error: albumUpsertError } = await supabase.from('albums').upsert({
    spotify_album_id: spotifyAlbum.id,
    title: spotifyAlbum.name,
    artist: spotifyAlbum.artists.map((a: any) => a.name).join(', '),
    cover_url: spotifyAlbum.images?.[0]?.url,
    added_by: userId
  }, { onConflict: 'spotify_album_id' }).select('*').single();
  if (albumUpsertError || !albumRow) {
    console.error('[suggestalbum] Error upserting into albums:', albumUpsertError);
    await interaction.reply({ content: 'Error saving album to database.', ephemeral: true });
    return;
  }
  // Increment pick_count for user
  await supabase.from('musicclub_rotation').update({
    pick_count: (nextPicker.pick_count || 0) + 1
  }).eq('user_id', userId);
  // Upsert into current_album table
  const { error: currentAlbumError, data: currentAlbumData } = await supabase.from('current_album').upsert({
    album_id: albumRow.id,
    album_title: albumRow.title,
    album_artist: albumRow.artist,
    cover_url: albumRow.cover_url,
    picked_by: userId,
    picked_at: new Date().toISOString(),
    spotify_album_id: albumRow.spotify_album_id
  });
  if (currentAlbumError) {
    console.error('[suggestalbum] Error upserting into current_album:', currentAlbumError);
    await interaction.reply({ content: 'Error saving current album to database.', ephemeral: true });
    return;
  }
  await interaction.reply({
    content: `🎵 Thanks for suggesting **${albumRow.title}** by *${albumRow.artist}*!`,
    embeds: [{
      title: albumRow.title,
      url: spotifyAlbum.external_urls.spotify,
      description: `by ${albumRow.artist}`,
      thumbnail: { url: albumRow.cover_url },
    }],
    allowedMentions: { users: [userId] }
  });
}
