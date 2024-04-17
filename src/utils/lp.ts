import { LiquidityPosition, User } from '../../generated/schema';

import { Address } from '@graphprotocol/graph-ts';

import { ZERO_BD, ZERO_BI } from '../utils/constants';

export function getOrCreateLiquidityPosition(
    exchange: Address,
    user: Address
): LiquidityPosition {
    let id = exchange.toHexString().concat('_').concat(user.toHexString());
    let liquidityTokenBalance = LiquidityPosition.load(id);
    if (liquidityTokenBalance === null) {
        liquidityTokenBalance = new LiquidityPosition(id);
        liquidityTokenBalance.liquidityTokenBalance = ZERO_BD;
        liquidityTokenBalance.pair = exchange.toHexString();
        liquidityTokenBalance.user = user.toHexString();
        liquidityTokenBalance.save();
    }
    return liquidityTokenBalance;
}

export function getOrCreateUser(address: Address): User {
    let user = User.load(address.toHexString());
    if (user === null) {
        user = new User(address.toHexString());
        user.vrswLockedPositionsNumber = ZERO_BI;
        user.save();
    }
    return user;
}
