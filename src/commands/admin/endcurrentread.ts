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
  if (fetchError || !current) {
    await interaction.reply({ content: 'No current read found to archive.', ephemeral: true });
    return;
  }
  // Insert into read_history with ended_at = now()
  const { error: insertError } = await supabase.from('read_history').insert({
    ...current,
    ended_at: new Date().toISOString()
  });
  if (insertError) {
    await interaction.reply({ content: 'Failed to archive the current read.', ephemeral: true });
    return;
  }
  // Delete from current_read
  const { error: deleteError } = await supabase.from('current_read').delete().eq('id', current.id);
  if (deleteError) {
    await interaction.reply({ content: 'Failed to remove the current read after archiving.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `The current read "${current.title}" has been archived! You can now vote for a new book!` });
}
