import type { Rider } from '../services/riderApi';

const formatCapacityValue = (value: number) => Number(value || 0).toFixed(1).replace(/\.0$/, '');

type Props = {
  rider: Rider;
};

const AssignedRiderCard = ({ rider }: Props) => (
  <div className="assigned-rider-card">
    <div>
      <p>
        <strong>Rider Name: </strong>
        <span>{rider.name}</span>
      </p>
      <p>Rider Vehicle: {rider.vehicle || 'Bike'}</p>
      <p>Rider Depot: {rider.depotName || rider.location} · Zone: {rider.zone}</p>
    </div>
    <div>
      <p>{rider.currentOrderCount}/{rider.orderCapacity} Orders</p>
      <p>{formatCapacityValue(rider.currentWeightKg)}/{formatCapacityValue(rider.weightCapacityKg)} kg</p>
      <strong>{rider.distanceKm == null ? 'Distance unavailable' : `${rider.distanceKm} km`}</strong>
    </div>
  </div>
);

export default AssignedRiderCard;
