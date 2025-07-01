import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const albumHistoryCommand = new SlashCommandBuilder()
  .setName('albumhistory')
  .setDescription('Show a list of all completed music club albums, who picked them, and their rating.');

export async function executeAlbumHistory(interaction: ChatInputCommandInteraction) {
  // Fetch album history with album details and average rating
  const { data, error } = await supabase
    .from('album_history')
    .select(`id, picked_by, picked_at, ended_at, rating, album_id, albums(title, artist, cover_url)`) // join albums
    .order('ended_at', { ascending: false });
  if (error || !data || data.length === 0) {
    await interaction.reply({ content: 'No album history found.', ephemeral: true });
    return;
  }
  // Build embeds (one embed for up to 10 albums)
  const embeds = [];
  for (let i = 0; i < data.length; i += 10) {
    const chunk = data.slice(i, i + 10);
    const embed = new EmbedBuilder()
      .setTitle('📚 Music Club Album History')
      .setDescription('Albums we have completed:')
      .setColor(0x1DB954);
    chunk.forEach((row, idx) => {
      const album = row.albums && Array.isArray(row.albums) ? row.albums[0] : row.albums;
      if (!album) return;
      embed.addFields({
        name: `${album.title} by ${album.artist}`,
        value: `Picked by: <@${row.picked_by}>\nEnded: <t:${Math.floor(new Date(row.ended_at).getTime() / 1000)}:d>\nRating: ${row.rating !== null ? row.rating.toFixed(2) : 'N/A'}`
      });
      if (album.cover_url && idx === 0) embed.setThumbnail(album.cover_url);
    });
    embeds.push(embed);
  }
  await interaction.reply({ embeds });
}
