import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const nextPickerCommand = new SlashCommandBuilder()
  .setName('nextpicker')
  .setDescription("[Admin] View who's next in the music club album rotation.");

export async function executeNextPicker(interaction: ChatInputCommandInteraction) {
  // Admin permission check
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  // Get all users in rotation
  const { data: allRotation, error } = await supabase
    .from('musicclub_rotation')
    .select('user_id, pick_count');
  if (error || !allRotation || allRotation.length === 0) {
    await interaction.reply({ content: 'No users found in the music club rotation.', ephemeral: true });
    return;
  }
  // Find user with lowest pick_count
  const next = allRotation.sort((a, b) => a.pick_count - b.pick_count)[0];
  if (!next) {
    await interaction.reply({ content: 'Could not determine the next picker.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `The next picker in the music club rotation is <@${next.user_id}>.`, allowedMentions: { users: [next.user_id] } });
}
