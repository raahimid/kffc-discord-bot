import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const endCurrentReadCommand = new SlashCommandBuilder()
  .setName('endcurrentread')
  .setDescription('Archive the current book and allow voting for a new one.');

export async function executeEndCurrentRead(interaction: ChatInputCommandInteraction) {
  // Admin permission check
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  // Fetch the current read
  const { data: current, error: fetchError } = await supabase.from('current_read').select('*').single();
  console.log('[endcurrentread] current_read row:', current);
  if (fetchError || !current) {
    await interaction.reply({ content: 'No current read found to archive.', ephemeral: true });
    return;
  }
  // Fetch book details for title
  const { data: book, error: bookError } = await supabase.from('books').select('title').eq('id', current.book_id).single();
  const bookTitle = book && book.title ? book.title : 'Unknown';
  await interaction.reply({ content: `The current read "${bookTitle}" has been archived! You can now vote for a new book!` });
}
