import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { searchSpotifyAlbum } from '../../utils/spotify';

export const searchAlbumCommand = new SlashCommandBuilder()
  .setName('searchalbum')
  .setDescription('Search and preview album details via Spotify (exploration only)')
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

export async function executeSearchAlbum(interaction: ChatInputCommandInteraction) {
  const album = interaction.options.getString('album', true);
  const artistRaw = interaction.options.getString('artist', false);
  const artist = artistRaw === null ? undefined : artistRaw;
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await searchSpotifyAlbum(album, artist);
    if (!result) {
      await interaction.editReply({ content: 'No album found for your query.' });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(result.title || 'Untitled')
      .setDescription(result.description || 'No description available.')
      .addFields(
        { name: 'Artist', value: result.artist || 'Unknown', inline: false },
        { name: 'Release Date', value: result.release_date || 'Unknown', inline: true },
        { name: 'Spotify Link', value: result.spotify_url || 'N/A', inline: false }
      )
      .setColor(0x1DB954);
    if (result.cover_url) {
      embed.setThumbnail(result.cover_url);
    }
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: 'Failed to fetch album info.' });
  }
}
