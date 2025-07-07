import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';
import { fetchBookFromGoogleBooks } from '../../utils/googleBooks';

export const setCurrentReadCommand = new SlashCommandBuilder()
  .setName('setcurrentread')
  .setDescription('Set the current read for the club (admin only)')
  .addStringOption(option =>
    option.setName('bookname')
      .setDescription('Book title (required)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('author')
      .setDescription('Author name (required)')
      .setRequired(true)
  );

export async function executeSetCurrentRead(interaction: ChatInputCommandInteraction) {
  // Only allow admins
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const bookname = interaction.options.getString('bookname', true);
  const author = interaction.options.getString('author', true);
  // Use Google Books utility for validation and metadata
  const book = await fetchBookFromGoogleBooks(bookname, author);
  if (!book) {
    await interaction.reply({ content: '🚫 Book not found 🚫 - please verify the name and author are correct.', ephemeral: true });
    return;
  }
  // Upsert book into books table
  const { data: bookRows, error: bookUpsertError } = await supabase
    .from('books')
    .upsert({
      title: book.title,
      author: book.author,
      image_url: book.image,
      description: book.description
    }, { onConflict: 'title,author' })
    .select('id')
    .limit(1);
  if (bookUpsertError || !bookRows || bookRows.length === 0) {
    await interaction.reply({ content: 'Failed to save book info. Please try again.', ephemeral: true });
    return;
  }
  const bookId = bookRows[0].id;
  // Insert into current_read
  const { error: insertError } = await supabase.from('current_read').insert({ book_id: bookId });
  if (insertError) {
    await interaction.reply({ content: 'Failed to set the current read.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `Current read set to "${book.title}" by ${book.author}.`, ephemeral: false });
}
