// src/commands/suggestbook.ts
import type { CommandInteraction, CacheType, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';
import { fetchBookFromGoogleBooks, GoogleBook } from '../utils/googleBooks';
import { supabase } from '../utils/supabase';

async function saveBookSuggestion(
  discordUserId: string,
  title: string,
  author: string
): Promise<{ success: boolean; reason?: string; book?: GoogleBook }> {
  // Prevent duplicate suggestions per user per round (Supabase check)
  // You may want to add a 'round' parameter for more advanced logic
  const { data: existing, error: fetchError } = await supabase
    .from('suggestions')
    .select('id')
    .eq('user_id', discordUserId)
    .limit(1);
  if (fetchError) {
    console.error('Supabase fetch error:', fetchError);
    return { success: false, reason: 'Database error. Please try again later.' };
  }
  if (existing && existing.length > 0) {
    return { success: false, reason: 'You have already suggested a book this round.' };
  }
  // Validate with Google Books API
  const book = await fetchBookFromGoogleBooks(title, author);
  if (!book) {
    return { success: false, reason: '🚫 Book not found 🚫 - please verify the name and author are correct.' };
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
    console.error('Supabase book upsert error:', bookUpsertError);
    return { success: false, reason: 'Failed to save book info. Please try again.' };
  }
  const bookId = bookRows[0].id;
  // Save suggestion with book_id
  const { error: insertError } = await supabase
    .from('suggestions')
    .insert({
      user_id: discordUserId,
      book_id: bookId
      // round: ... // add if you have a round system
    });
  if (insertError) {
    console.error('Supabase insert error:', insertError);
    return { success: false, reason: 'Failed to save suggestion. Please try again.' };
  }
  return { success: true, book };
}

export async function executeSuggestBook(interaction: ChatInputCommandInteraction<CacheType>) {
  const title = interaction.options.getString('title', true);
  const author = interaction.options.getString('author', true);
  const discordUserId = interaction.user.id;

  const result = await saveBookSuggestion(discordUserId, title, author);

  if (!result.success) {
    await interaction.reply({ content: result.reason!, ephemeral: true });
    return;
  }

  const { book } = result;
  await interaction.reply({
    content: `Thanks for suggesting **${book!.title}** by *${book!.author}*!\n![cover image](${book!.image})`,
    ephemeral: true,
  });
}

export const suggestBookCommand = new SlashCommandBuilder()
  .setName('suggestbook')
  .setDescription('Suggest a book for the club!')
  .addStringOption(option =>
    option.setName('title')
      .setDescription('Title of the book')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('author')
    .setDescription('Author of the book')
    .setRequired(true)
  );