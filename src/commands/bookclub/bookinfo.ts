import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const bookInfoCommand = new SlashCommandBuilder()
  .setName('bookinfo')
  .setDescription('Look up book details via Google Books API (exploration only)')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Book title, author, or keywords')
      .setRequired(true)
  );

export async function executeBookInfo(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('query', true);
  await interaction.deferReply({ ephemeral: true });
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      await interaction.editReply({ content: 'No results found for your query.' });
      return;
    }
    const book = data.items[0].volumeInfo;
    const embed = new EmbedBuilder()
      .setTitle(book.title || 'Untitled')
      .setDescription(book.description ? (book.description.length > 500 ? book.description.slice(0, 497) + '...' : book.description) : 'No description available.')
      .addFields(
        { name: 'Authors', value: book.authors ? book.authors.join(', ') : 'Unknown', inline: false },
        { name: 'Publisher', value: book.publisher || 'Unknown', inline: true },
        { name: 'Published', value: book.publishedDate || 'Unknown', inline: true }
      )
      .setFooter({ text: book.infoLink || '' })
      .setColor(0x4f8cff);
    if (book.imageLinks && book.imageLinks.thumbnail) {
      embed.setThumbnail(book.imageLinks.thumbnail);
    }
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: 'Failed to fetch book info.' });
  }
}
