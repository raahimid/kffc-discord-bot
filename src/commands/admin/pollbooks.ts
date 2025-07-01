import { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Interaction, InteractionCollector } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const pollBooksCommand = new SlashCommandBuilder()
  .setName('pollbooks')
  .setDescription('Start a poll for all current book suggestions (admin only)');

export async function executePollBooks(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('id, book_id, books (title, author)');
  if (error || !suggestions || suggestions.length === 0) {
    await interaction.reply({ content: 'No suggestions to poll.', ephemeral: true });
    return;
  }
  // Build a row of buttons for each suggestion (max 5 per row, 25 total)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  suggestions.slice(0, 25).forEach((s, idx) => {
    let book: any = s.books;
    if (Array.isArray(book)) {
      book = book.length > 0 ? book[0] : {};
    } else if (!book) {
      book = {};
    }
    if (idx % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());
    rows[rows.length - 1].addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_${s.id}`)
        .setLabel(`${book.title || 'Untitled'}${book.author ? ' by ' + book.author : ''}`.slice(0, 80))
        .setStyle(ButtonStyle.Primary)
    );
  });
  // Add an End Poll button for admins
  const endPollButton = new ButtonBuilder()
    .setCustomId('end_poll')
    .setLabel('End Poll')
    .setStyle(ButtonStyle.Danger);
  const endRow = new ActionRowBuilder<ButtonBuilder>().addComponents(endPollButton);
  await interaction.reply({ content: 'Vote for the next book!', components: [...rows, endRow] });

  // Track votes in the database
  const collector = interaction.channel!.createMessageComponentCollector({
    componentType: ComponentType.Button
  });

  collector.on('collect', async i => {
    if (i.customId === 'end_poll') {
      if (!i.memberPermissions?.has('Administrator')) {
        await i.reply({ content: 'Only admins can end the poll.', ephemeral: true });
        return;
      }
      collector.stop();
      await i.reply({ content: 'Poll ended by admin.', ephemeral: false });
      return;
    }
    const suggestion = suggestions.find(s => `vote_${s.id}` === i.customId);
    if (!suggestion) return;
    // Upsert vote in book_votes table so user can only have one vote (update if they vote again)
    const { error: voteError } = await supabase.from('book_votes').upsert([
      {
        suggestion_id: suggestion.id,
        user_id: i.user.id
      }
    ], { onConflict: 'user_id' });
    if (voteError) {
      console.error('Vote upsert error:', voteError);
      await i.reply({ content: 'Failed to record your vote.', ephemeral: true });
      return;
    }
    await i.reply({ content: 'Your vote has been updated!', ephemeral: true });
  });

  collector.on('end', async () => {
    // Fetch all votes from the database
    const { data: votesData } = await supabase
      .from('book_votes')
      .select('suggestion_id, user_id');
    // Tally votes in JS
    const tally: Record<string, number> = {};
    if (votesData) {
      for (const v of votesData) {
        tally[v.suggestion_id] = (tally[v.suggestion_id] || 0) + 1;
      }
    }
    let winnerId = null;
    let maxVotes = 0;
    for (const s of suggestions) {
      const count = tally[s.id] || 0;
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = s.id;
      }
    }
    if (!winnerId) {
      await interaction.followUp({ content: 'No votes were cast. No book selected.', ephemeral: true });
      return;
    }
    // Set current read
    const winnerSuggestion = suggestions.find(s => s.id === winnerId);
    if (winnerSuggestion) {
      await supabase.from('current_read').insert({ book_id: winnerSuggestion.book_id });
    }
    // Clear all suggestions and votes
    await supabase.from('suggestions').delete().neq('id', '');
    await supabase.from('book_votes').delete().neq('id', '');
    await interaction.followUp({ content: 'Poll ended! The winning book has been set as the current read and suggestions have been cleared.', ephemeral: false });
  });
}
