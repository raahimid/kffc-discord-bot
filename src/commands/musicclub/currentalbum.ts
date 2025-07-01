import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const currentAlbumCommand = new SlashCommandBuilder()
  .setName('currentalbum')
  .setDescription('Show the currently selected album for the music club');

export async function executeCurrentAlbum(interaction: ChatInputCommandInteraction) {
  // Fetch the current album from Supabase
  const { data: album, error } = await supabase.from('current_album').select('*').single();
  if (error || !album) {
    await interaction.reply({ content: '❌ No album is currently active.', ephemeral: true });
    return;
  }
  // Build the embed
  const embed = new EmbedBuilder()
    .setTitle('🎧 Current Album')
    .setDescription(`**${album.album_title}**\nby *${album.album_artist}*`)
    .addFields(
      { name: 'Picked by', value: `<@${album.picked_by}>`, inline: true },
      { name: 'Picked at', value: album.picked_at ? `<t:${Math.floor(new Date(album.picked_at).getTime() / 1000)}:F>` : 'Unknown', inline: true }
    );
  if (album.cover_url) {
    embed.setThumbnail(album.cover_url);
  }
  await interaction.reply({ embeds: [embed] });
}
