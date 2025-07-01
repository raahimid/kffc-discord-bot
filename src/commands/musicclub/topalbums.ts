import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const topAlbumsCommand = new SlashCommandBuilder()
  .setName('topalbums')
  .setDescription('Show the top-rated albums in music club history.');

const PAGE_SIZE = 10;

export async function executeTopAlbums(interaction: ChatInputCommandInteraction) {
  // Fetch all rated albums, order by rating DESC
  const { data, error } = await supabase
    .from('album_history')
    .select('album_id, rating, albums(title, artist, cover_url)')
    .order('rating', { ascending: false });
  if (error || !data || data.length === 0) {
    await interaction.reply({ content: 'No rated albums found.', ephemeral: true });
    return;
  }

  // Filter out albums with no ratings
  const ratedData = data.filter(row => row.rating !== null && row.rating !== undefined);
  if (ratedData.length === 0) {
    await interaction.reply({ content: 'No rated albums found.', ephemeral: true });
    return;
  }

  let page = 0;
  const maxPage = Math.ceil(ratedData.length / PAGE_SIZE) - 1;

  const getEmbed = (page: number) => {
    const chunk = ratedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const embed = new EmbedBuilder()
      .setTitle('🏆 Top Rated Albums')
      .setColor(0x1DB954);
    chunk.forEach((row, idx) => {
      const album = row.albums && Array.isArray(row.albums) ? row.albums[0] : row.albums;
      if (!album) return;
      embed.addFields({
        name: `#${page * PAGE_SIZE + idx + 1}: ${album.title} by ${album.artist}`,
        value: `Rating: ${row.rating !== null ? row.rating.toFixed(2) : 'N/A'}`
      });
      if (album.cover_url && idx === 0) embed.setThumbnail(album.cover_url);
    });
    embed.setFooter({ text: `Page ${page + 1} of ${maxPage + 1}` });
    return embed;
  };

  const getRow = (page: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === maxPage)
  );

  const reply = await interaction.reply({
    embeds: [getEmbed(page)],
    components: [getRow(page)],
    ephemeral: true
  });

  if (maxPage === 0) return;

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'Only the command user can change pages.', ephemeral: true });
      return;
    }
    if (i.customId === 'prev' && page > 0) page--;
    if (i.customId === 'next' && page < maxPage) page++;
    await i.update({ embeds: [getEmbed(page)], components: [getRow(page)] });
  });

  collector.on('end', async () => {
    await reply.edit({ components: [getRow(page).setComponents(
      ...getRow(page).components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    )] });
  });
}
