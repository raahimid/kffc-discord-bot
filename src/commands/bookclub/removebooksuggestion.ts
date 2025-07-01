import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const removeBookSuggestionCommand = new SlashCommandBuilder()
  .setName('removebooksuggestion')
  .setDescription('Remove your book suggestion for the current round');

export async function executeRemoveBookSuggestion(interaction: ChatInputCommandInteraction) {
  const userId = interaction.user.id;
  // Remove the user's suggestion for the current round (add round logic if needed)
  const { error, data } = await supabase
    .from('suggestions')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) {
    await interaction.reply({ content: 'Failed to remove your suggestion. Please try again later.', ephemeral: true });
    return;
  }
  if (!data || data.length === 0) {
    await interaction.reply({ content: 'You have no suggestion to remove.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Your book suggestion has been removed.', ephemeral: true });
}
