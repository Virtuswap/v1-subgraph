import {
    TokenomicsParams,
    LpStakingPosition,
    VrswStakingPosition,
} from '../../generated/schema';

import { ZERO_BD, ZERO_BI } from '../utils/constants';

import { Address } from '@graphprotocol/graph-ts';

export function getOrCreateTokenomicsParams(): TokenomicsParams {
    let tokenomicsParams = TokenomicsParams.load('1');
    if (!tokenomicsParams) {
        tokenomicsParams = new TokenomicsParams('1');
        tokenomicsParams.alpha = ZERO_BD;
        tokenomicsParams.beta = ZERO_BD;
        tokenomicsParams.gamma = ZERO_BD;
        tokenomicsParams.b = ZERO_BD;
        tokenomicsParams.r = ZERO_BD;
        tokenomicsParams.lpShare = ZERO_BD;
        tokenomicsParams.lpShareFactor = ZERO_BD;
        tokenomicsParams.save();
    }
    return tokenomicsParams;
}

export function getOrCreateLpStakingPosition(
    user: Address,
    lpToken: Address
): LpStakingPosition {
    const lpStakingPositionId =
        user.toHexString() + '_' + lpToken.toHexString();
    let lpStakingPosition = LpStakingPosition.load(lpStakingPositionId);
    if (!lpStakingPosition) {
        lpStakingPosition = new LpStakingPosition(lpStakingPositionId);
        lpStakingPosition.user = user.toHexString();
        lpStakingPosition.pair = lpToken.toHexString();
        lpStakingPosition.amount = ZERO_BD;
        lpStakingPosition.mu = ZERO_BD;
        lpStakingPosition.save();
    }
    return lpStakingPosition;
}

export function getOrCreateVrswStakingPosition(
    user: Address,
    position: string
): VrswStakingPosition {
    const vrswStakingPositionId = user.toHexString() + '_' + position;
    let vrswStakingPosition = VrswStakingPosition.load(vrswStakingPositionId);
    if (!vrswStakingPosition) {
        vrswStakingPosition = new VrswStakingPosition(vrswStakingPositionId);
        vrswStakingPosition.user = user.toHexString();
        vrswStakingPosition.amount = ZERO_BD;
        vrswStakingPosition.lockDue = ZERO_BI;
        vrswStakingPosition.discountFactor = ZERO_BD;
        vrswStakingPosition.timestamp = ZERO_BI;
        vrswStakingPosition.mu = ZERO_BD;
        vrswStakingPosition.save();
    }
    return vrswStakingPosition;
}
