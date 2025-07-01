import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const skipTurnCommand = new SlashCommandBuilder()
  .setName('skipturn')
  .setDescription("[Admin] Skip a user's turn in the music club rotation.")
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to skip')
      .setRequired(true)
  );

export async function executeSkipTurn(interaction: ChatInputCommandInteraction) {
  // Admin permission check
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const user = interaction.options.getUser('user', true);
  // Check if user is in the rotation
  const { data: rotation, error } = await supabase.from('musicclub_rotation').select('*').eq('user_id', user.id).single();
  if (error || !rotation) {
    await interaction.reply({ content: 'That user is not in the music club rotation.', ephemeral: true });
    return;
  }
  // Remove user from rotation (or mark as skipped)
  const { error: deleteError } = await supabase.from('musicclub_rotation').delete().eq('user_id', user.id);
  if (deleteError) {
    await interaction.reply({ content: 'Failed to skip this user. Please try again.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `User <@${user.id}>'s turn has been skipped and they have been removed from the current rotation.`, allowedMentions: { users: [] } });
}
