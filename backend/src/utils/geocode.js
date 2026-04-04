const axios = require('axios');

// Simple in-memory cache: query -> { value, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

async function geocodeAddress(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query for geocoding');
  }

  const key = query.trim();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const params = {
    q: key,
    format: 'jsonv2',
    limit: 1,
    addressdetails: 1,
    countrycodes: 'pk',
  };

  const headers = {
    'User-Agent': 'RiderAssignmentApp/1.0 (zayednauman@gmail.com)',
    Accept: 'application/json',
  };

  const response = await axios.get(NOMINATIM_URL, { params, headers });

  if (!response || !response.data || !response.data.length) {
    throw new Error('No geocoding results');
  }

  const first = response.data[0];
  const result = {
    latitude: parseFloat(first.lat),
    longitude: parseFloat(first.lon),
    displayName: first.display_name,
    address: first.address,
  };

  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

module.exports = { geocodeAddress };
