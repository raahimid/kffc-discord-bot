import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { searchSpotifyAlbum, getSpotifyAlbumTracks, addTrackToSpotifyPlaylist, getSpotifyToken } from '../../utils/spotify';

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
  )
  .addStringOption(option =>
    option.setName('album')
      .setDescription('Album title (must match a finished album)')
      .setRequired(true)
  );

export async function executeAddToPlaylist(interaction: ChatInputCommandInteraction) {
  const song = interaction.options.getString('song', true);
  const artist = interaction.options.getString('artist', true);
  const albumTitle = interaction.options.getString('album', true);
  const userId = interaction.user.id;

  // Look up finished albums by title and artist
  const { data: albums, error } = await supabase
    .from('album_history')
    .select('album_id, albums(title, artist)')
    .order('ended_at', { ascending: false });
  if (error || !albums || albums.length === 0) {
    await interaction.reply({ content: 'No finished albums found to check against.', ephemeral: true });
    return;
  }
  // Find album by title and artist (case-insensitive)
  const found = albums.find(row => {
    const album = row.albums && Array.isArray(row.albums) ? row.albums[0] : row.albums;
    return album && album.artist.toLowerCase() === artist.toLowerCase() && album.title.toLowerCase() === albumTitle.toLowerCase();
  });
  if (!found) {
    await interaction.reply({ content: 'This album is not in the club history. Only songs from finished albums can be added.', ephemeral: true });
    return;
  }

  // Validate song is on the album using Spotify
  let trackMatch = null;
  let trackUri = null;
  try {
    const spotifyAlbum = await searchSpotifyAlbum(albumTitle, artist);
    if (!spotifyAlbum) {
      await interaction.reply({ content: 'Could not find this album on Spotify to verify the track.', ephemeral: true });
      return;
    }
    const tracks = await getSpotifyAlbumTracks(spotifyAlbum.id);
    trackMatch = tracks.find(t => t.name.toLowerCase() === song.toLowerCase());
    if (!trackMatch) {
      await interaction.reply({ content: `"${song}" is not on the album "${albumTitle}" by ${artist} (per Spotify).`, ephemeral: true });
      return;
    }
    // Get the track URI from the album's tracklist
    const albumTracksResp = await fetch(`https://api.spotify.com/v1/albums/${spotifyAlbum.id}/tracks?limit=50`, {
      headers: { 'Authorization': `Bearer ${await getSpotifyToken()}` }
    });
    const albumTracksData = await albumTracksResp.json();
    const foundTrack = albumTracksData.items.find((t: any) => t.name.toLowerCase() === song.toLowerCase());
    trackUri = foundTrack ? foundTrack.uri : null;
  } catch (err) {
    await interaction.reply({ content: 'Failed to verify song on album via Spotify.', ephemeral: true });
    return;
  }

  // Insert into playlist_songs
  const { error: insertError } = await supabase.from('playlist_songs').insert({
    id: uuidv4(),
    song_name: trackMatch.name, // Use Spotify's canonical name
    artist: artist,
    album_id: found.album_id,
    added_by: userId,
    spotify_uri: trackUri,
    // added_at will default to now()
  });
  if (insertError) {
    console.error('Supabase insert error:', insertError);
    await interaction.reply({ content: `Failed to add song to playlist. Error: ${insertError.message || insertError.details || insertError}`, ephemeral: true });
    return;
  }

  // Add to Spotify playlist if we have a user access token
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
  const userAccessToken = process.env.SPOTIFY_USER_ACCESS_TOKEN;
  if (trackUri && playlistId && userAccessToken) {
    try {
      await addTrackToSpotifyPlaylist(trackUri, playlistId, userAccessToken);
    } catch (err) {
      await interaction.followUp({ content: 'Song added to database, but failed to add to Spotify playlist. Please check bot permissions and token.', ephemeral: true });
    }
  } else if (!userAccessToken) {
    await interaction.followUp({ content: 'Song added to database, but Spotify playlist sync is not configured (missing user access token).', ephemeral: true });
  }

  await interaction.reply({ content: `Added song: **${trackMatch.name}**\nAlbum: **${albumTitle}** by **${artist}**\nAdded by: <@${userId}>`, ephemeral: false });
}
