import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
// Make sure the path is correct and the file exists; adjust if necessary:
import { supabase } from '../../utils/supabase';

export const currentReadCommand = new SlashCommandBuilder()
  .setName('currentread')
  .setDescription('Show the book the club is currently reading');

export async function executeCurrentRead(interaction: ChatInputCommandInteraction) {
  // Get the most recent/current read (join with books)
  const { data, error } = await supabase
    .from('current_read')
    .select('book_id, started_at, books (title, author, image_url, description)')
    .order('started_at', { ascending: false })
    .limit(1);

  if (error) {
    await interaction.reply({ content: 'Failed to fetch the current read.', flags: 64 });
    return;
  }
  if (!data || data.length === 0 || !data[0].books) {
    await interaction.reply({ content: 'No current read is set!', flags: 64 });
    return;
  }
  let book: any = data[0].books;
  if (Array.isArray(book)) {
    book = book.length > 0 ? book[0] : undefined;
  }
  if (!book || typeof book !== 'object') {
    await interaction.reply({ content: 'No current read is set!', flags: 64 });
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle(book.title || 'Untitled')
    .setImage(book.image_url || null)
    .addFields(
      { name: 'Author', value: book.author || 'Unknown', inline: false },
      { name: 'Description', value: book.description ? (book.description.length > 300 ? book.description.slice(0, 297) + '...' : book.description) : 'No description available.', inline: false }
    )
    .setColor(0x4f8cff);
  await interaction.reply({ embeds: [embed], flags: 64 });
}
