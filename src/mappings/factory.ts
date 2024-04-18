import { PairCreated as PairCreatedEvent } from '../../generated/vPairFactory/vPairFactory';
import { vPair as vPairContract } from '../../generated/templates/vPair/vPair';
import { Pair, Token } from '../../generated/schema';
import { vPair } from '../../generated/templates';
import { ZERO_BD, ZERO_BI } from '../utils/constants';
import { newToken } from '../utils/token';
import { BigInt } from '@graphprotocol/graph-ts';

export function handlePairCreated(event: PairCreatedEvent): void {
    let pair = new Pair(event.params.poolAddress.toHexString());
    let token0 = Token.load(event.params.token0.toHexString());
    let token1 = Token.load(event.params.token1.toHexString());

    if (!token0) {
        token0 = newToken(event.params.token0);
        if (!token0) return;
        token0.save();
    }

    if (!token1) {
        token1 = newToken(event.params.token1);
        if (!token1) return;
        token1.save();
    }

    pair.token0 = token0.id;
    pair.token1 = token1.id;
    pair.balance0 = ZERO_BD;
    pair.balance1 = ZERO_BD;
    pair.fee = BigInt.fromI32(event.params.fee);
    pair.vFee = BigInt.fromI32(event.params.vFee);
    pair.maxReserveRatio = event.params.maxReserveRatio;
    pair.createdAtTimestamp = event.block.timestamp;
    pair.createdAtBlockNumber = event.block.number;
    let pairContract = vPairContract.bind(event.params.poolAddress);
    pair.blocksDelay = pairContract.blocksDelay();
    pair.reserveRatio = ZERO_BI;
    pair.totalSupply = ZERO_BD;
    pair.totalMu = ZERO_BD;
    pair.totalStaked = ZERO_BD;
    pair.lastSwapBlock = ZERO_BI;
    pair.lastSwapTimestamp = ZERO_BI;
    pair.allocationPoints = ZERO_BI;
    pair.token0Price = ZERO_BD;
    pair.token1Price = ZERO_BD;
    pair.save();

    vPair.create(event.params.poolAddress);
}
