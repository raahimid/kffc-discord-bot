import fetch from 'node-fetch';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not set');
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get Spotify token');
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export async function searchSpotifyAlbum(album: string, artist?: string) {
  const token = await getSpotifyToken();
  let q = `album:${album}`;
  if (artist) q += ` artist:${artist}`;
  const url = `https://api.spotify.com/v1/search?type=album&limit=1&q=${encodeURIComponent(q)}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resp.json();
  if (!data.albums || !data.albums.items.length) return null;
  return data.albums.items[0];
}

export async function getSpotifyAlbumTracks(albumId: string): Promise<{ name: string }[]> {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resp.json();
  if (!data.items) return [];
  return data.items.map((track: any) => ({ name: track.name }));
}

export async function addTrackToSpotifyPlaylist(trackUri: string, playlistId: string, userAccessToken: string) {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [trackUri] })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Spotify playlist add failed: ${err}`);
  }
  return true;
}

export { getSpotifyToken };
