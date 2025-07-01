import { Client } from 'discord.js';
import { supabase } from '../../utils/supabase';

export async function syncAudiophileRotation(client: Client) {
  for (const guild of client.guilds.cache.values()) {
    // Ensure all members are fetched (required for large servers or on startup)
    await guild.members.fetch();
    const audiophileRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'audiophile');
    if (!audiophileRole) {
      console.log(`[syncAudiophileRotation] No Audiophile role found in guild ${guild.name}`);
      continue;
    }
    const members = audiophileRole.members.map(m => m.user.id);
    if (members.length === 0) continue;
    // Only insert missing users
    const { data: existingRows, error: fetchError } = await supabase.from('musicclub_rotation').select('user_id');
    if (fetchError) {
      console.log(`[syncAudiophileRotation] Error fetching rotation table:`, fetchError);
      continue;
    }
    const existingIds = existingRows?.map(r => r.user_id) ?? [];
    const newIds = members.filter(id => !existingIds.includes(id));
    if (newIds.length > 0) {
      await supabase.from('musicclub_rotation').insert(newIds.map(id => ({ user_id: id, pick_count: 0 })));
    }
    // Remove users from rotation who no longer have the role
    if (members.length > 0) {
      // Use parenthesis syntax for PostgREST
      const paren = `(${members.join(',')})`;
      await supabase.from('musicclub_rotation').delete().not('user_id', 'in', paren);
    }
  }
}
