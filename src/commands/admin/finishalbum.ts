import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { supabase } from '../../utils/supabase';

export const finishAlbumCommand = new SlashCommandBuilder()
  .setName('finishalbum')
  .setDescription('Archive the current album and clear the current round (admin only)');

export async function executeFinishAlbum(interaction: ChatInputCommandInteraction) {
  // Admin permission check
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  // Fetch the current album
  const { data: current, error: fetchError } = await supabase.from('current_album').select('*').single();
  if (fetchError || !current) {
    await interaction.reply({ content: 'No current album found to archive.', ephemeral: true });
    return;
  }
  // Fetch album details for required fields
  const { data: album, error: albumError } = await supabase.from('albums').select('title, artist').eq('id', current.album_id).single();
  if (albumError || !album) {
    await interaction.reply({ content: 'Could not find album details for archiving.', ephemeral: true });
    return;
  }
  // Insert into album_history with ended_at = now() and required fields
  const { error: insertError } = await supabase.from('album_history').insert({
    album_id: current.album_id,
    picked_by: current.picked_by,
    picked_at: current.picked_at,
    ended_at: new Date().toISOString(),
    album_title: album.title,
    album_artist: album.artist
  });
  if (insertError) {
    console.error('[finishalbum] Error inserting into album_history:', insertError);
    await interaction.reply({ content: `Failed to archive the current album.\nError: ${insertError.message || insertError.details || insertError}`, ephemeral: true });
    return;
  }
  // Delete from current_album
  const { error: deleteError } = await supabase.from('current_album').delete().eq('album_id', current.album_id);
  if (deleteError) {
    await interaction.reply({ content: 'Failed to remove the current album after archiving.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: `The current album "${album.title}" has been archived! You can now start a new round.` });
}
