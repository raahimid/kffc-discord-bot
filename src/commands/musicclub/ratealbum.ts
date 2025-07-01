import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const rateAlbumCommand = new SlashCommandBuilder()
  .setName('ratealbum')
  .setDescription('Rate a previously completed album (1-10)')
  .addStringOption(option =>
    option.setName('album')
      .setDescription('Album title (autocomplete)')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('rating')
      .setDescription('Your rating (1-10)')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(true)
  );

export async function executeRateAlbum(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  const albumTitle = interaction.options.getString('album', true);
  const rating = interaction.options.getInteger('rating', true);
  // Find album in album_history (by title, case-insensitive)
  console.log('[ratealbum] Looking up album:', albumTitle);
  const { data: albumHist, error: histError } = await supabase
    .from('album_history')
    .select('album_id, album_title, album_artist')
    .ilike('album_title', albumTitle); // ilike is case-insensitive
  console.log('[ratealbum] Album lookup result:', albumHist);
  if (histError || !albumHist || (Array.isArray(albumHist) && albumHist.length === 0)) {
    await interaction.reply({ content: 'Album not found in history.', ephemeral: true });
    return;
  }
  // If multiple matches, pick the first
  const albumRow = Array.isArray(albumHist) ? albumHist[0] : albumHist;
  // Upsert rating (allow update on conflict)
  console.log('[ratealbum] Upserting rating:', {
    album_id: albumRow.album_id,
    user_id: userId,
    rating
  });
  const { error: rateError } = await supabase.from('album_ratings').upsert([
    {
      album_id: albumRow.album_id,
      user_id: userId,
      rating
    }
  ], { onConflict: 'album_id,user_id' });
  if (rateError) {
    console.error('[ratealbum] Error upserting into album_ratings:', rateError);
    await interaction.reply({ content: `Failed to save your rating.\nError: ${rateError.message || rateError.details || rateError}`, ephemeral: true });
    return;
  }
  // Update average rating in album_history (only if album_history row exists)
  const { data: ratings } = await supabase.from('album_ratings').select('rating').eq('album_id', albumRow.album_id);
  if (ratings && ratings.length > 0) {
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    // Only update if album_history row exists for this album_id
    const { data: histRows } = await supabase.from('album_history').select('id').eq('album_id', albumRow.album_id);
    console.log('[ratealbum] Updating album_history.rating for album_id:', albumRow.album_id, 'avg:', avg, 'histRows:', histRows);
    if (histRows && histRows.length > 0) {
      const { error: updateError } = await supabase.from('album_history').update({ rating: avg }).eq('album_id', albumRow.album_id);
      if (updateError) {
        console.error('[ratealbum] Error updating album_history.rating:', updateError);
      }
    }
  }
  await interaction.reply({ content: `Your rating for "${albumTitle}" has been saved!` });
}
