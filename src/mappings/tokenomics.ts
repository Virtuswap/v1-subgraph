import {
    LockStakedVrsw as LockStakedVrswEvent,
    LockVrsw as LockVrswEvent,
    MuChanged as MuChangedEvent,
    StakeLp as StakeLpEvent,
    StakeVrsw as StakeVrswEvent,
    UnlockVrsw as UnlockVrswEvent,
    UnstakeLp as UnstakeLpEvent,
    UnstakeVrsw as UnstakeVrswEvent,
    VStaker as VStakerContract,
} from '../../generated/VStaker/VStaker';

import { AllocationPointsChanged as AllocationPointsChangedEvent } from '../../generated/VChainMinter/VChainMinter';

import {
    UpdateTokenomicsParams as UpdateTokenomicsParamsEvent,
    UpdateLpBaseRewardsShare as UpdateLpBaseRewardsShareEvent,
} from '../../generated/VTokenomicsParams/VTokenomicsParams';

import { Pair, VrswStakingPosition } from '../../generated/schema';

import { log, store } from '@graphprotocol/graph-ts';

import { getOrCreateUser } from '../utils/lp';

import { intToDecimal } from '../utils/helpers';

import {
    getOrCreateTokenomicsParams,
    getOrCreateLpStakingPosition,
    getOrCreateVrswStakingPosition,
} from '../utils/tokenomics';

import {
    ZERO_BI,
    ONE_BI,
    BI_18,
    ADDRESS_ZERO,
    ZERO_BD,
} from '../utils/constants';

export function handleAllocationPointsChanged(
    event: AllocationPointsChangedEvent
): void {
    for (let i = 0; i < event.params._pools.length; ++i) {
        let pair = Pair.load(event.params._pools[i].toHexString());
        if (!pair) {
            log.error('Pair {} is null in AllocationPointsChanged event', [
                event.params._pools[i].toHexString(),
            ]);
            continue;
        }
        pair.allocationPoints = event.params._allocationPoints[i];
        pair.save();
    }
}

export function handleLockStakedVrsw(event: LockStakedVrswEvent): void {
    let user = getOrCreateUser(event.params.who);
    let positionsNumber = user.vrswLockedPositionsNumber.plus(ONE_BI);
    user.vrswLockedPositionsNumber = positionsNumber;
    user.save();
    let vrswStakingPosition = getOrCreateVrswStakingPosition(
        event.params.who,
        positionsNumber.toString()
    );
    let vStakerContract = VStakerContract.bind(event.address);
    let vrswStake = vStakerContract.vrswStakes(
        event.params.who,
        positionsNumber
    );
    vrswStakingPosition.amount = intToDecimal(vrswStake.getAmount(), BI_18);
    vrswStakingPosition.discountFactor = intToDecimal(
        vrswStake.getDiscountFactor(),
        BI_18
    );
    vrswStakingPosition.timestamp = vrswStake.getStartTs();
    vrswStakingPosition.lockDue = vrswStake
        .getLockDuration()
        .plus(vrswStakingPosition.timestamp);
    vrswStakingPosition.save();

    let vrswUnlockedPosition = getOrCreateVrswStakingPosition(
        event.params.who,
        '0'
    );
    let vrswUnlockedStake = vStakerContract.vrswStakes(
        event.params.who,
        ZERO_BI
    );
    vrswUnlockedPosition.amount = intToDecimal(
        vrswUnlockedStake.getAmount(),
        BI_18
    );
    vrswUnlockedPosition.discountFactor = intToDecimal(
        vrswUnlockedStake.getDiscountFactor(),
        BI_18
    );
    vrswUnlockedPosition.timestamp = vrswUnlockedStake.getStartTs();
    vrswUnlockedPosition.save();
}

export function handleLockVrsw(event: LockVrswEvent): void {
    let user = getOrCreateUser(event.params.who);
    let positionsNumber = user.vrswLockedPositionsNumber.plus(ONE_BI);
    user.vrswLockedPositionsNumber = positionsNumber;
    user.save();
    let vStakerContract = VStakerContract.bind(event.address);
    let vrswStake = vStakerContract.vrswStakes(
        event.params.who,
        positionsNumber
    );
    let vrswStakingPosition = getOrCreateVrswStakingPosition(
        event.params.who,
        positionsNumber.toString()
    );
    vrswStakingPosition.amount = intToDecimal(vrswStake.getAmount(), BI_18);
    vrswStakingPosition.discountFactor = intToDecimal(
        vrswStake.getDiscountFactor(),
        BI_18
    );
    vrswStakingPosition.timestamp = vrswStake.getStartTs();
    vrswStakingPosition.lockDue = event.params.lockDuration.plus(
        vrswStakingPosition.timestamp
    );
    vrswStakingPosition.save();
}

export function handleMuChanged(event: MuChangedEvent): void {
    if (event.params.pool.toHexString() != ADDRESS_ZERO.toHexString()) {
        let pair = Pair.load(event.params.pool.toHexString());
        if (!pair) {
            log.error('Pair is null in handleMuChanged event {} !== {}', [
                event.params.pool.toHexString(),
                ADDRESS_ZERO.toHexString(),
            ]);
            return;
        }
        pair.totalMu = intToDecimal(event.params.totalMu, BI_18);
        pair.save();

        let lpStakingPosition = getOrCreateLpStakingPosition(
            event.params.who,
            event.params.pool
        );
        lpStakingPosition.mu = intToDecimal(event.params.mu, BI_18);
        lpStakingPosition.save();
    } else {
        let vrswStakingPosition = getOrCreateVrswStakingPosition(
            event.params.who,
            '0'
        );
        vrswStakingPosition.mu = intToDecimal(event.params.mu, BI_18);
        vrswStakingPosition.save();
    }
}

export function handleStakeLp(event: StakeLpEvent): void {
    let vStakerContract = VStakerContract.bind(event.address);
    let lpStakingPosition = getOrCreateLpStakingPosition(
        event.params.who,
        event.params.lpToken
    );
    const lpStakeIndex = vStakerContract.lpStakeIndex(
        event.params.who,
        event.params.lpToken
    );
    if (lpStakeIndex != ZERO_BI) {
        lpStakingPosition.amount = intToDecimal(
            vStakerContract
                .lpStakes(event.params.who, lpStakeIndex)
                .getAmount(),
            BI_18
        );
    } else {
        lpStakingPosition.amount = ZERO_BD;
    }
    lpStakingPosition.save();
}

export function handleStakeVrsw(event: StakeVrswEvent): void {
    let vStakerContract = VStakerContract.bind(event.address);
    let vrswStakingPosition = getOrCreateVrswStakingPosition(
        event.params.who,
        '0'
    );
    const vrswStake = vStakerContract.vrswStakes(event.params.who, ZERO_BI);
    vrswStakingPosition.amount = intToDecimal(vrswStake.getAmount(), BI_18);
    vrswStakingPosition.discountFactor = intToDecimal(
        vrswStake.getDiscountFactor(),
        BI_18
    );
    vrswStakingPosition.timestamp = vrswStake.getStartTs();
    vrswStakingPosition.save();
}

export function handleUnlockVrsw(event: UnlockVrswEvent): void {
    let user = getOrCreateUser(event.params.who);
    let positionsNumber = user.vrswLockedPositionsNumber.minus(ONE_BI);
    user.vrswLockedPositionsNumber = positionsNumber;
    user.save();
    for (let i = ZERO_BI; ; i = i.plus(ONE_BI)) {
        const vrswPositionId =
            event.params.who.toHexString() + '_' + i.toString();
        let vrswPosition = VrswStakingPosition.load(vrswPositionId);
        if (vrswPosition) {
            store.remove('VrswStakingPosition', vrswPositionId);
        } else {
            break;
        }
    }
    let vStakerContract = VStakerContract.bind(event.address);
    for (let i = ZERO_BI; ; i = i.plus(ONE_BI)) {
        const vrswStake = vStakerContract.try_vrswStakes(event.params.who, i);
        if (!vrswStake.reverted) {
            let vrswStakingPosition = getOrCreateVrswStakingPosition(
                event.params.who,
                i.toString()
            );
            vrswStakingPosition.amount = intToDecimal(
                vrswStake.value.getAmount(),
                BI_18
            );
            vrswStakingPosition.discountFactor = intToDecimal(
                vrswStake.value.getDiscountFactor(),
                BI_18
            );
            vrswStakingPosition.timestamp = vrswStake.value.getStartTs();
            if (i == ZERO_BI) {
                vrswStakingPosition.mu = intToDecimal(
                    vStakerContract.mu(event.params.who, ADDRESS_ZERO),
                    BI_18
                );
            } else {
                vrswStakingPosition.lockDue = vrswStake.value
                    .getLockDuration()
                    .plus(vrswStakingPosition.timestamp);
            }
            vrswStakingPosition.save();
        } else {
            break;
        }
    }
}

export function handleUnstakeLp(event: UnstakeLpEvent): void {
    let vStakerContract = VStakerContract.bind(event.address);
    let lpStakingPosition = getOrCreateLpStakingPosition(
        event.params.who,
        event.params.lpToken
    );
    const lpStakeIndex = vStakerContract.lpStakeIndex(
        event.params.who,
        event.params.lpToken
    );
    if (lpStakeIndex == ZERO_BI) {
        lpStakingPosition.amount = ZERO_BD;
    } else {
        lpStakingPosition.amount = intToDecimal(
            vStakerContract
                .lpStakes(event.params.who, lpStakeIndex)
                .getAmount(),
            BI_18
        );
    }
    lpStakingPosition.save();
}

export function handleUnstakeVrsw(event: UnstakeVrswEvent): void {
    let vStakerContract = VStakerContract.bind(event.address);
    let vrswStakingPosition = getOrCreateVrswStakingPosition(
        event.params.who,
        '0'
    );
    const vrswStake = vStakerContract.vrswStakes(event.params.who, ZERO_BI);
    vrswStakingPosition.amount = intToDecimal(vrswStake.getAmount(), BI_18);
    vrswStakingPosition.discountFactor = intToDecimal(
        vrswStake.getDiscountFactor(),
        BI_18
    );
    vrswStakingPosition.timestamp = vrswStake.getStartTs();
    vrswStakingPosition.save();
}

export function handleUpdateTokenomicsParams(
    event: UpdateTokenomicsParamsEvent
): void {
    let tokenomicsParams = getOrCreateTokenomicsParams();
    tokenomicsParams.alpha = intToDecimal(event.params.alpha, BI_18);
    tokenomicsParams.beta = intToDecimal(event.params.beta, BI_18);
    tokenomicsParams.gamma = intToDecimal(event.params.gamma, BI_18);
    tokenomicsParams.b = intToDecimal(event.params.b, BI_18);
    tokenomicsParams.r = intToDecimal(event.params.r, BI_18);
    tokenomicsParams.save();
}

export function handleUpdateLpBaseRewardsShare(
    event: UpdateLpBaseRewardsShareEvent
): void {
    let tokenomicsParams = getOrCreateTokenomicsParams();
    tokenomicsParams.lpShare = intToDecimal(
        event.params.lpBaseRewardsShare,
        BI_18
    );
    tokenomicsParams.lpShareFactor = intToDecimal(
        event.params.lpBaseRewardsShareFactor,
        BI_18
    );
    tokenomicsParams.save();
}
