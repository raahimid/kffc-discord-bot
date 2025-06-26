// src/commands/suggestbook.ts
import type { CommandInteraction, CacheType, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';

async function saveBookSuggestion(
  discordUserId: string,
  title: string,
  author?: string,
  comment?: string
): Promise<void> {
  console.log('Saving book suggestion:', { discordUserId, title, author, comment });
}

export async function executeSuggestBook(interaction: ChatInputCommandInteraction<CacheType>) {
  const title = interaction.options.getString('title', true);
  const author = interaction.options.getString('author') ?? 'Unknown';
  const comment = interaction.options.getString('comment') ?? '';

  const discordUserId = interaction.user.id;

  await saveBookSuggestion(discordUserId, title, author, comment);

  await interaction.reply({
    content: `Thanks for suggesting **${title}** by *${author}*!`,
    ephemeral: true,
  });
}

export const suggestBookCommand = new SlashCommandBuilder()
  .setName('suggestbook')
  .setDescription('Suggest a book for the club!')
  .addStringOption(option =>
    option.setName('title')
      .setDescription('Title of the book')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('author')
      .setDescription('Author of the book')
      .setRequired(false)
  )
  .addStringOption(option =>
    option.setName('comment')
      .setDescription('Any comments or why you recommend it?')
      .setRequired(false)
  );
