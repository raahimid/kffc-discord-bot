import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabase } from '../utils/supabase';

export const readHistoryCommand = new SlashCommandBuilder()
  .setName('readhistory')
  .setDescription('Show all past reads, who suggested them, and their average rating');

export async function executeReadHistory(interaction: ChatInputCommandInteraction) {
  // Fetch read history with book info, who suggested, and ratings
  const { data: history, error } = await supabase
    .from('read_history')
    .select(`
      book_id,
      started_at,
      finished_at,
      title,
      author,
      suggestions:user_suggestion!read_history_book_id_fkey(user_id),
      book_ratings(rating)
    `)
    .order('finished_at', { ascending: false });

  if (error || !history || history.length === 0) {
    await interaction.reply({ content: 'No book history found.', ephemeral: true });
    return;
  }

  // Build the embed
  const embed = new EmbedBuilder()
    .setTitle('Book Club History')
    .setColor(0x6a4cff)
    .setDescription('Here are the books we have read:');

  let desc = '';
  let count = 1;
  for (const entry of history) {
    // Average rating
    let avgRating = 'N/A';
    if (entry.book_ratings && entry.book_ratings.length > 0) {
      const sum = entry.book_ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      avgRating = (sum / entry.book_ratings.length).toFixed(2);
    }
    // Who suggested
    let suggestedBy = entry.suggestions && entry.suggestions.length > 0 ? `<@${entry.suggestions[0].user_id}>` : 'Unknown';
    desc += `**${count}. ${entry.title}**\nAuthor: ${entry.author}\nSuggested By: ${suggestedBy}\nOur Rating: ${avgRating}\n\n`;
    count++;
  }
  embed.setDescription(desc);

  await interaction.reply({ embeds: [embed], ephemeral: false });
}
