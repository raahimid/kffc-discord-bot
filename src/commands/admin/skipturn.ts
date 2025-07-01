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
  // Instead of removing, increment their pick_count to move them to the end
  const { error: updateError } = await supabase.from('musicclub_rotation')
    .update({ pick_count: rotation.pick_count + 1 })
    .eq('user_id', user.id);
  if (updateError) {
    await interaction.reply({ content: 'Failed to skip this user. Please try again.', ephemeral: true });
    return;
  }
  // Find the next user in rotation (lowest pick_count, not the skipped user)
  const { data: allRotation, error: allError } = await supabase
    .from('musicclub_rotation')
    .select('user_id, pick_count');
  if (allError || !allRotation || allRotation.length === 0) {
    await interaction.reply({ content: 'Skipped user, but could not determine the next in rotation.', ephemeral: true });
    return;
  }
  // Exclude skipped user, sort by pick_count, pick first
  const next = allRotation.filter(r => r.user_id !== user.id)
    .sort((a, b) => a.pick_count - b.pick_count)[0];
  let nextMsg = next ? ` Next up: <@${next.user_id}>!` : '';
  await interaction.reply({ content: `User <@${user.id}>'s turn has been skipped. Their pick has been moved to the end of the rotation!${nextMsg}`, allowedMentions: { users: [] } });
}
