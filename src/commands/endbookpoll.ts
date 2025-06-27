import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { supabase } from '../utils/supabase';

export const endBookPollCommand = new SlashCommandBuilder()
  .setName('endbookpoll')
  .setDescription('End the current book poll and set the winner as the current read (admin only)');

export async function executeEndBookPoll(interaction: ChatInputCommandInteraction) {
  // Only allow admins
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }

  // Get all votes
  const { data: votes, error: votesError } = await supabase
    .from('book_votes')
    .select('suggestion_id');
  if (votesError || !votes || votes.length === 0) {
    await interaction.reply({ content: 'No votes found or poll is not active.', ephemeral: true });
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
    await interaction.reply({ content: 'No winner could be determined.', ephemeral: true });
    return;
  }

  // Move previous current read to read_history (if any)
  const { data: prevCurrent, error: prevError } = await supabase
    .from('current_read')
    .select('book_id, started_at')
    .order('started_at', { ascending: false })
    .limit(1);
  if (prevCurrent && prevCurrent.length > 0) {
    // Get book details for history
    const { data: bookInfo } = await supabase
      .from('books')
      .select('title, author')
      .eq('id', prevCurrent[0].book_id)
      .single();
    // Get suggester for this book (from suggestions table, if any)
    let suggestedBy = null;
    const { data: suggestionRow } = await supabase
      .from('suggestions')
      .select('user_id')
      .eq('book_id', prevCurrent[0].book_id)
      .limit(1)
      .single();
    if (suggestionRow && suggestionRow.user_id) {
      suggestedBy = suggestionRow.user_id;
    }
    await supabase.from('read_history').insert({
      book_id: prevCurrent[0].book_id,
      title: bookInfo?.title || null,
      author: bookInfo?.author || null,
      started_at: prevCurrent[0].started_at,
      finished_at: new Date().toISOString(),
      suggested_by: suggestedBy
    });
    // Remove previous current read (with WHERE clause)
    await supabase.from('current_read').delete().eq('book_id', prevCurrent[0].book_id);
  }

  // Set new current read (replace any existing row)
  const { data: winnerSuggestion } = await supabase
    .from('suggestions')
    .select('book_id')
    .eq('id', winnerId)
    .single();
  if (!winnerSuggestion) {
    await interaction.reply({ content: 'Could not find the winning suggestion.', ephemeral: true });
    return;
  }
  const { error: setError } = await supabase
    .from('current_read')
    .insert({ book_id: winnerSuggestion.book_id, started_at: new Date().toISOString() });
  if (setError) {
    await interaction.reply({ content: 'Failed to set the current read.', ephemeral: true });
    return;
  }

  // Clean up: delete all book_votes for all suggestions, then delete all suggestions
  const { data: allSuggestions } = await supabase.from('suggestions').select('id');
  if (allSuggestions && allSuggestions.length > 0) {
    const allIds = allSuggestions.map(s => s.id);
    // Delete all votes for these suggestions first
    const { error: deleteVotesError } = await supabase.from('book_votes').delete().in('suggestion_id', allIds);
    if (deleteVotesError) {
      console.error('Failed to delete book votes:', deleteVotesError);
    }
    // Now delete all suggestions
    const { error: deleteAllSuggestionsError } = await supabase.from('suggestions').delete().in('id', allIds);
    if (deleteAllSuggestionsError) {
      console.error('Failed to delete all suggestions:', deleteAllSuggestionsError);
    }
  } else {
    console.log('No suggestions to delete after poll.');
  }

  await interaction.reply({ content: 'Poll ended! The book with the most votes is now the current read.', ephemeral: false });
}
