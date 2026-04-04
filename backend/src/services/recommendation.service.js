const prisma = require('../config/prisma');
const { geocodeAddress } = require('../utils/geocode');
const { calculateDistanceKm } = require('../utils/distance');

/**
 * Recommend riders for a destination address within a zone.
 * @param {string} deliveryAddress
 * @param {string} zone
 * @returns {Promise<Object>} { destination, topRider, recommendations }
 */
async function recommendRidersForDestination(deliveryAddress, zone) {
  if (!deliveryAddress) throw new Error('deliveryAddress required');
  if (!zone) throw new Error('zone required');

  const destination = await geocodeAddress(deliveryAddress);

  const riders = await prisma.rider.findMany({
    where: {
      isAvailable: true,
      zone: zone,
      latitude: { not: null },
      longitude: { not: null },
    },
  });

  const filtered = riders.filter((r) => r.currentLoad < r.maxLoad && r.currentWeight < r.maxWeight);

  const recommendations = filtered
    .map((r) => {
      const distanceKm = calculateDistanceKm(
        destination.latitude,
        destination.longitude,
        r.latitude,
        r.longitude
      );

      return {
        id: r.id,
        name: r.name,
        distanceKm: Number(distanceKm.toFixed(2)),
        depotLatitude: r.latitude,
        depotLongitude: r.longitude,
        currentLoad: r.currentLoad,
        maxLoad: r.maxLoad,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const topRider = recommendations.length ? recommendations[0] : null;

  return {
    destination: {
      address: destination.displayName || deliveryAddress,
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
    topRider,
    recommendations,
  };
}

module.exports = { recommendRidersForDestination };
