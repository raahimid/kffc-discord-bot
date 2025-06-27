import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, User } from 'discord.js';
import { supabase } from '../utils/supabase';

export const readHistoryCommand = new SlashCommandBuilder()
  .setName('readhistory')
  .setDescription('Show all past reads and their average rating');

const BOOKS_PER_PAGE = 7;

export async function executeReadHistory(interaction: ChatInputCommandInteraction) {
  // Fetch read history with book info and suggester
  const { data: history, error } = await supabase
    .from('read_history')
    .select(`
      book_id,
      started_at,
      finished_at,
      title,
      author,
      suggested_by
    `)
    .order('finished_at', { ascending: false });

  if (error || !history || history.length === 0) {
    await interaction.reply({ content: 'No book history found.', ephemeral: true });
    return;
  }

  // Fetch all ratings for these books
  const bookIds = history.map(h => h.book_id);
  let ratingsMap: Record<string, number[]> = {};
  if (bookIds.length > 0) {
    const { data: ratings } = await supabase
      .from('book_ratings')
      .select('book_id, rating');
    if (ratings) {
      for (const r of ratings) {
        if (!ratingsMap[r.book_id]) ratingsMap[r.book_id] = [];
        ratingsMap[r.book_id].push(r.rating);
      }
    }
  }

  // Sort history by average rating (descending)
  const historyWithAvg = history.map(entry => {
    const ratings = ratingsMap[entry.book_id] || [];
    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return { ...entry, avgRating: avg };
  });
  historyWithAvg.sort((a, b) => b.avgRating - a.avgRating);

  // Helper to get user mention from ID (fetch from Discord if possible)
  function getUserMention(userId: string | null | undefined) {
    return userId ? `<@${userId}>` : 'Unknown';
  }

  // Pagination logic
  let page = 0;
  const totalPages = Math.ceil(historyWithAvg.length / BOOKS_PER_PAGE);

  const getPageEmbed = (pageNum: number) => {
    const embed = new EmbedBuilder()
      .setTitle('Book Club History')
      .setColor(0x6a4cff)
      .setDescription(`Page ${pageNum + 1} of ${totalPages}`);
    let desc = '';
    const start = pageNum * BOOKS_PER_PAGE;
    const end = Math.min(start + BOOKS_PER_PAGE, historyWithAvg.length);
    for (let i = start; i < end; i++) {
      const entry = historyWithAvg[i];
      let avgRating = entry.avgRating > 0 ? entry.avgRating.toFixed(2) : 'N/A';
      desc += `**${i + 1}. ${entry.title}**\nAuthor: ${entry.author}\nOur Rating: ${avgRating}\nSuggested by: ${getUserMention(entry.suggested_by)}\n\n`;
    }
    embed.setDescription(desc);
    return embed;
  };

  const getActionRow = (pageNum: number) => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNum === 0),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageNum >= totalPages - 1)
    );
  };

  // Send initial embed
  const reply = await interaction.reply({
    embeds: [getPageEmbed(page)],
    components: totalPages > 1 ? [getActionRow(page)] : [],
    ephemeral: false
  });

  if (totalPages <= 1) return;

  // Set up collector for button interactions
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: i => i.user.id === interaction.user.id
  });

  collector?.on('collect', async i => {
    if (!i.isButton()) return;
    if (i.customId === 'prev_page' && page > 0) {
      page--;
    } else if (i.customId === 'next_page' && page < totalPages - 1) {
      page++;
    }
    await i.update({
      embeds: [getPageEmbed(page)],
      components: [getActionRow(page)]
    });
  });

  collector?.on('end', async () => {
    // Disable buttons after timeout
    if (interaction.channel) {
      try {
        await interaction.editReply({
          embeds: [getPageEmbed(page)],
          components: []
        });
      } catch (e) {}
    }
  });
}
