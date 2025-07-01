import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const topBooksCommand = new SlashCommandBuilder()
  .setName('topbooks')
  .setDescription('Show the top-rated books in the club history');

export async function executeTopBooks(interaction: ChatInputCommandInteraction) {
  // Get all books in read_history
  const { data: history, error } = await supabase
    .from('read_history')
    .select('book_id, title, author')
    .order('finished_at', { ascending: false });
  if (error || !history || history.length === 0) {
    await interaction.reply({ content: 'No book history found.', ephemeral: true });
    return;
  }
  // Get all ratings for these books
  const bookIds = history.map(h => h.book_id);
  let ratingsMap: Record<string, number[]> = {};
  if (bookIds.length > 0) {
    const { data: ratings } = await supabase
      .from('book_ratings')
      .select('book_id, rating');
    if (ratings) {
      for (const r of ratings) {
        if (!ratingsMap[r.book_id]) ratingsMap[r.book_id] = [];
        ratingsMap[r.book_id].push(r.rating);
      }
    }
  }
  // Aggregate and sort
  const booksWithAvg = history.map(entry => {
    const ratings = ratingsMap[entry.book_id] || [];
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      ...entry,
      avgRating: avg,
      numRatings: ratings.length
    };
  }).filter(b => b.numRatings > 0);
  booksWithAvg.sort((a, b) => b.avgRating - a.avgRating || b.numRatings - a.numRatings);
  // Format output
  let desc = '';
  for (const book of booksWithAvg.slice(0, 10)) {
    desc += `📘 **${book.title}** by *${book.author}*\n`;
    desc += `⭐️ ${book.avgRating.toFixed(1)}/5 from ${book.numRatings} rating${book.numRatings === 1 ? '' : 's'}\n\n`;
  }
  if (!desc) desc = 'No rated books yet.';
  await interaction.reply({ content: desc, ephemeral: false });
}
