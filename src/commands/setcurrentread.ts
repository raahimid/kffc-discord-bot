import { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, ComponentType } from 'discord.js';
import { supabase } from '../utils/supabase';

export const setCurrentReadCommand = new SlashCommandBuilder()
  .setName('setcurrentread')
  .setDescription('Set the current read for the club (admin only)');

export async function executeSetCurrentRead(interaction: ChatInputCommandInteraction) {
  // Only allow admins
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  // Fetch all suggestions with book info
  const { data: suggestions, error } = await supabase
    .from('suggestions')
    .select('id, book_id, books (title, author)');
  if (error || !suggestions || suggestions.length === 0) {
    await interaction.reply({ content: 'No suggestions found.', ephemeral: true });
    return;
  }
  // Build select menu options using book info
  const options = suggestions.slice(0, 25).map((s: any) => ({
    label: `${s.books?.title || 'Untitled'}${s.books?.author ? ' by ' + s.books.author : ''}`.slice(0, 100),
    value: s.book_id
  }));
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_book')
    .setPlaceholder('Select a book suggestion')
    .addOptions(options);
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  await interaction.reply({ content: 'Select a book to set as the current read:', components: [row], ephemeral: true });

  const collector = interaction.channel!.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
    filter: i => i.user.id === interaction.user.id
  });

  collector.on('collect', async (i: StringSelectMenuInteraction) => {
    const bookId = i.values[0];
    const { error: insertError } = await supabase
      .from('current_read')
      .insert({ book_id: bookId });
    if (insertError) {
      await i.reply({ content: 'Failed to set the current read.', ephemeral: true });
    } else {
      await i.reply({ content: 'Current read has been set!', ephemeral: true });
    }
    collector.stop();
  });

  collector.on('end', async () => {
    try {
      await interaction.editReply({ components: [] });
    } catch {}
  });
}
