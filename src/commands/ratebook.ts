import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../utils/supabase';

export const rateBookCommand = new SlashCommandBuilder()
  .setName('ratebook')
  .setDescription('Rate a book you have read (must be in read history)')
  .addStringOption(option =>
    option.setName('title')
      .setDescription('Title of the book to rate')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('rating')
      .setDescription('Your rating (1-5)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(5)
  )
  .addStringOption(option =>
    option.setName('comment')
      .setDescription('Optional comment about the book')
      .setRequired(false)
  );

export async function executeRateBook(interaction: ChatInputCommandInteraction) {
  const title = interaction.options.getString('title', true);
  const rating = interaction.options.getInteger('rating', true);
  const comment = interaction.options.getString('comment', false);
  const userId = interaction.user.id;

  // Find the book_id for the given title (allow partial match, handle multiple)
  const { data: books, error: bookError } = await supabase
    .from('books')
    .select('id, title')
    .ilike('title', `%${title.trim()}%`);

  console.log('RateBook search:', { search: title.trim(), found: books, error: bookError });

  if (!books || books.length === 0) {
    await interaction.reply({ content: 'Book not found. Please check the title or try a partial title.', ephemeral: true });
    return;
  }
  if (books.length > 1) {
    const titles = books.map(b => b.title).join(', ');
    await interaction.reply({ content: `Multiple books found: ${titles}. Please be more specific.`, ephemeral: true });
    return;
  }
  const book = books[0];

  // Check if this book_id is in read_history for anyone
  const { data: bookInHistory } = await supabase
    .from('read_history')
    .select('id')
    .eq('book_id', book.id)
    .limit(1)
    .single();

  if (!bookInHistory) {
    await interaction.reply({ content: 'This book is not in the club\'s read history and cannot be rated.', ephemeral: true });
    return;
  }

  // Insert or upsert into book_ratings
  const { error: rateError } = await supabase
    .from('book_ratings')
    .upsert({
      user_id: userId,
      book_id: book.id,
      rating,
      comment
    }, { onConflict: 'user_id,book_id' });

  if (rateError) {
    await interaction.reply({ content: 'Failed to save your rating. Please try again.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: `Thank you for rating **${title}**!`, ephemeral: true });
}
