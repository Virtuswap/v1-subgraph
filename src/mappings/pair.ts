import {
    vPair as vPairContract,
    AllowListChanged as AllowListChangedEvent,
    BlocksDelayChanged as BlocksDelayChangedEvent,
    Burn as BurnEvent,
    FeeChanged as FeeChangedEvent,
    Mint as MintEvent,
    ReserveSync as ReserveSyncEvent,
    ReserveThresholdChanged as ReserveThresholdChangedEvent,
    Transfer as TransferEvent,
    vSync as vSyncEvent,
} from '../../generated/templates/vPair/vPair';

import {
    Pair,
    Token,
    PairWhitelist,
    PairReserve,
} from '../../generated/schema';

import { log, BigInt, store, Address } from '@graphprotocol/graph-ts';

import { intToDecimal } from '../utils/helpers';

import { getOrCreateLiquidityPosition, getOrCreateUser } from '../utils/lp';

import { newToken } from '../utils/token';

import { getOrCreatePairReserve } from '../utils/pairReserve';

import { ZERO_BD, BI_18, ADDRESS_ZERO } from '../utils/constants';

export function handleAllowListChanged(event: AllowListChangedEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error(
            'Pair is null while processing handleAllowListChanged event',
            []
        );
        return;
    }
    let pairWhitelist = Pair.load(event.address.toHexString());
    if (!pairWhitelist) {
        log.error(
            'PairWhitelist is null while processing handleAllowListChanged event',
            []
        );
        return;
    }
    let oldWhitelist = pair.whitelist.load();
    for (let i = oldWhitelist.length - 1; i >= 0; --i) {
        let pairReserve = PairReserve.load(oldWhitelist[i].id);
        if (pairReserve) {
            pairReserve.balance = ZERO_BD;
            pairReserve.baseValue = ZERO_BD;
            pairReserve.save();
        }
        store.remove('PairWhitelist', oldWhitelist[i].id);
    }
    let pairContract = vPairContract.bind(event.address);
    for (let i = 0; i < event.params.tokens.length; ++i) {
        let token = Token.load(event.params.tokens[i].toHexString());
        if (!token) {
            token = newToken(event.params.tokens[i]);
            if (!token) {
                return;
            }
            token.save();
        }
        const refToken = Token.load(pair.token0)!;
        let pairWhitelist = new PairWhitelist(
            event.address.toHexString() +
                '_' +
                event.params.tokens[i].toHexString()
        );
        pairWhitelist.token = token.id;
        pairWhitelist.pair = pair.id;
        pairWhitelist.save();

        let pairReserve = getOrCreatePairReserve(
            event.address.toHexString() +
                '_' +
                event.params.tokens[i].toHexString()
        );
        pairReserve.balance = intToDecimal(
            pairContract.reserves(
                Address.fromBytes(Address.fromHexString(token.id))
            ),
            token.decimals
        );
        pairReserve.baseValue = intToDecimal(
            pairContract.reservesBaseValue(
                Address.fromBytes(Address.fromHexString(token.id))
            ),
            refToken.decimals
        );
        pairReserve.save();
    }
    pair.reserveRatio = pairContract.calculateReserveRatio();
    pair.save();
}

export function handleBlocksDelayChanged(event: BlocksDelayChangedEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error(
            'Pair is null while processing handleBlocksDelayChanged event',
            []
        );
        return;
    }
    pair.blocksDelay = event.params._newBlocksDelay;
    pair.save();
}

export function handleBurn(event: BurnEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing handleBurn event', []);
        return;
    }
    pair.totalSupply = intToDecimal(event.params.totalSupply, BI_18);
    pair.save();

    let whitelist = pair.whitelist.load();
    let pairContract = vPairContract.bind(event.address);
    for (let i = 0; i < whitelist.length; ++i) {
        const token = Token.load(whitelist[i].token);
        if (!token) {
            log.error('Token is null while processing handleBurn event', []);
            return;
        }
        const refToken = Token.load(pair.token0)!;
        let pairReserve = getOrCreatePairReserve(whitelist[i].id);
        pairReserve.balance = intToDecimal(
            pairContract.reserves(
                Address.fromBytes(Address.fromHexString(token.id))
            ),
            token.decimals
        );
        pairReserve.baseValue = intToDecimal(
            pairContract.reservesBaseValue(
                Address.fromBytes(Address.fromHexString(token.id))
            ),
            refToken.decimals
        );
        pairReserve.save();
    }
}

export function handleFeeChanged(event: FeeChangedEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing handleFeeChanged event', []);
        return;
    }
    pair.fee = BigInt.fromI32(event.params.fee);
    pair.vFee = BigInt.fromI32(event.params.vFee);
    pair.save();
}

export function handleMint(event: MintEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing handleMint event', []);
        return;
    }
    pair.totalSupply = intToDecimal(event.params.poolLPTokens, BI_18);
    pair.save();
}

export function handleReserveSync(event: ReserveSyncEvent): void {
    let pairContract = vPairContract.bind(event.address);

    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing handleReserveSync event', []);
        return;
    }
    pair.lastSwapBlock = event.block.number;
    pair.lastSwapTimestamp = event.block.timestamp;
    pair.save();

    let reserveToken = Token.load(event.params.asset.toHexString());
    if (!reserveToken) {
        log.error('Token is null while processing handleReserveSync event', []);
        return;
    }
    let refToken = Token.load(pair.token0)!;
    const pairReserveId =
        event.address.toHexString() + '_' + event.params.asset.toHexString();
    let pairReserve = getOrCreatePairReserve(pairReserveId);
    pairReserve.balance = intToDecimal(
        event.params.balance,
        reserveToken.decimals
    );
    pairReserve.baseValue = intToDecimal(
        pairContract.reservesBaseValue(event.params.asset),
        refToken.decimals
    );
    pairReserve.save();
}

export function handleReserveThresholdChanged(
    event: ReserveThresholdChangedEvent
): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing handleFeeChanged event', []);
        return;
    }
    pair.maxReserveRatio = event.params.newThreshold;
    pair.save();
}

export function handleTransfer(event: TransferEvent): void {
    let from = event.params.from;
    getOrCreateUser(from);
    let to = event.params.to;
    getOrCreateUser(to);

    let pairContract = vPairContract.bind(event.address);
    if (from.toHexString() != ADDRESS_ZERO.toHexString()) {
        let fromUserLiquidityPosition = getOrCreateLiquidityPosition(
            event.address,
            from
        );
        fromUserLiquidityPosition.liquidityTokenBalance = intToDecimal(
            pairContract.balanceOf(from),
            BI_18
        );
        fromUserLiquidityPosition.save();
    }
    if (to.toHexString() != ADDRESS_ZERO.toHexString()) {
        let toUserLiquidityPosition = getOrCreateLiquidityPosition(
            event.address,
            to
        );
        toUserLiquidityPosition.liquidityTokenBalance = intToDecimal(
            pairContract.balanceOf(to),
            BI_18
        );
        toUserLiquidityPosition.save();
    }
}

export function handlevSync(event: vSyncEvent): void {
    let pair = Pair.load(event.address.toHexString());
    if (!pair) {
        log.error('Pair is null while processing vsync event', []);
        return;
    }
    let token0 = Token.load(pair.token0);
    if (!token0) {
        log.error('Token0 is null while processing vsync event', []);
        return;
    }
    let token1 = Token.load(pair.token1);
    if (!token1) {
        log.error('Token1 is null while processing vsync event', []);
        return;
    }
    let pairContract = vPairContract.bind(event.address);
    pair.lastSwapBlock = event.block.number;
    pair.lastSwapTimestamp = event.block.timestamp;
    pair.balance0 = intToDecimal(event.params.balance0, token0.decimals);
    pair.balance1 = intToDecimal(event.params.balance1, token1.decimals);
    pair.reserveRatio = pairContract.calculateReserveRatio();
    pair.token0Price = pair.balance1.notEqual(ZERO_BD)
        ? pair.balance0.div(pair.balance1)
        : ZERO_BD;
    pair.token1Price = pair.balance0.notEqual(ZERO_BD)
        ? pair.balance1.div(pair.balance0)
        : ZERO_BD;
    pair.save();
}
