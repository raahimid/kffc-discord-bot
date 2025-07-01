import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const endPollCommand = new SlashCommandBuilder()
  .setName('endpoll')
  .setDescription('End the current book poll and set the winner as the current read (admin only)');

// DEPRECATED: This command has been replaced by endbookpoll.ts. Use /endbookpoll instead.
export async function executeEndPoll(interaction: ChatInputCommandInteraction) {
  // Only allow admins
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
    return;
  }

  // Get all votes
  const { data: votes, error: votesError } = await supabase
    .from('book_votes')
    .select('suggestion_id');
  if (votesError || !votes || votes.length === 0) {
    await interaction.reply({ content: 'No votes found or poll is not active.', flags: 64 });
    return;
  }

  // Tally votes
  const tally: Record<string, number> = {};
  for (const vote of votes) {
    tally[vote.suggestion_id] = (tally[vote.suggestion_id] || 0) + 1;
  }
  // Find winner (first in case of tie)
  const winnerId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!winnerId) {
    await interaction.reply({ content: 'No winner could be determined.', flags: 64 });
    return;
  }

  // Set as current read
  const { error: setError } = await supabase
    .from('current_read')
    .insert({ suggestion_id: winnerId });
  if (setError) {
    await interaction.reply({ content: 'Failed to set the current read.', flags: 64 });
    return;
  }

  // Clean up: delete all suggestions and votes
  await supabase.from('suggestions').delete().neq('id', 0); // delete all
  await supabase.from('book_votes').delete().neq('id', 0);

  await interaction.reply({ content: 'Poll ended! The book with the most votes is now the current read.', ephemeral: false });
}
