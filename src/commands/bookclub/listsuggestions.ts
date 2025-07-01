import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, InteractionCollector } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const listBookSuggestionsCommand = new SlashCommandBuilder()
  .setName('listbooksuggestions')
  .setDescription('List all book suggestions for the current round');

export async function executeListBookSuggestions(interaction: ChatInputCommandInteraction) {
  // Fetch all suggestions for the current round (add round logic if needed)
  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('id, user_id, book_id, books (title, author, image_url, description)');

  if (error) {
    await interaction.reply({ content: 'Failed to fetch suggestions.', ephemeral: true });
    return;
  }

  if (!suggestions || suggestions.length === 0) {
    await interaction.reply({ content: 'No suggestions yet!', ephemeral: true });
    return;
  }

  let index = 0;
  const getEmbed = (i: number) => {
    const s = suggestions[i];
    let book: any = s.books;
    if (Array.isArray(book)) {
      book = book.length > 0 ? book[0] : {};
    } else if (!book) {
      book = {};
    }
    const author = book.author ? String(book.author) : 'Unknown';
    const user = s.user_id ? `<@${s.user_id}>` : 'Unknown';
    let description = typeof book.description === 'string' && book.description.trim() ? book.description : 'No description available.';
    if (description.length > 300) description = description.slice(0, 297) + '...';
    return new EmbedBuilder()
      .setTitle(String(book.title || 'Untitled'))
      .setImage(book.image_url || null)
      .addFields(
        { name: 'Author', value: author, inline: false },
        { name: 'Suggested by', value: user, inline: false },
        { name: 'Description', value: description, inline: false }
      )
      .setFooter({ text: `Suggestion ${i + 1} of ${suggestions.length}` })
      .setColor(0x4f8cff);
  };

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('⬅️ Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('➡️ Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(suggestions.length === 1)
  );

  await interaction.reply({ embeds: [getEmbed(index)], components: [row] });

  const message = await interaction.fetchReply();
  const collector = interaction.channel!.createMessageComponentCollector({
    message,
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'Only the command user can use these buttons.', ephemeral: true });
      return;
    }
    if (i.customId === 'prev') index--;
    if (i.customId === 'next') index++;
    // Update button states
    row.components[0].setDisabled(index === 0);
    row.components[1].setDisabled(index === suggestions.length - 1);
    await i.update({ embeds: [getEmbed(index)], components: [row] });
  });

  collector.on('end', async () => {
    row.components[0].setDisabled(true);
    row.components[1].setDisabled(true);
    try {
      await interaction.editReply({ components: [row] });
    } catch {}
  });
}
