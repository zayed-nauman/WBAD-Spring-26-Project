import type { Rider } from '../services/riderApi';

const formatCapacityValue = (value: number) => Number(value || 0).toFixed(1).replace(/\.0$/, '');

type Props = {
  rider: Rider;
  selected: boolean;
  topMatch?: boolean;
  onSelect: () => void;
};

const RiderRecommendationCard = ({ rider, selected, topMatch = false, onSelect }: Props) => (
  <button type="button" className={`rider-recommendation ${selected ? 'selected' : ''}`} onClick={onSelect}>
    {topMatch && <span className="rider-top-match">Top Match</span>}
    <strong>{rider.name}</strong>
    <span className="rider-pill rider-pill-blue" title="Distance from rider location to delivery location">
      {rider.distanceKm == null ? 'Distance unavailable' : `${rider.distanceKm} km`}
    </span>
    <span className="rider-pill rider-pill-yellow">{rider.currentOrderCount}/{rider.orderCapacity} orders</span>
    <span className="rider-pill rider-pill-green">{formatCapacityValue(rider.currentWeightKg)}/{formatCapacityValue(rider.weightCapacityKg)} kg</span>
    <span className={`rider-radio ${selected ? 'selected' : ''}`} />
  </button>
);

export default RiderRecommendationCard;
