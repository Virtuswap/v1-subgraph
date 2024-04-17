import { PairReserve } from '../../generated/schema';

import { ZERO_BD } from './constants';

export function getOrCreatePairReserve(id: string): PairReserve {
    let pairReserve = PairReserve.load(id);
    if (!pairReserve) {
        pairReserve = new PairReserve(id);
        pairReserve.pair = id.split('_')[0];
        pairReserve.token = id.split('_')[1];
        pairReserve.balance = ZERO_BD;
        pairReserve.baseValue = ZERO_BD;
        pairReserve.save();
    }
    return pairReserve;
}
