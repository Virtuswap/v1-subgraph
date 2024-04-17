import { ERC20 } from '../../generated/vPairFactory/ERC20';
import { log, BigInt, Address } from '@graphprotocol/graph-ts';
import { Token } from '../../generated/schema';

export function fetchTokenSymbol(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);
    return contract.symbol();
}

export function fetchTokenName(tokenAddress: Address): string {
    let contract = ERC20.bind(tokenAddress);
    return contract.name();
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress);
    return BigInt.fromI32(contract.decimals());
}

export function newToken(tokenAddress: Address): Token | null {
    let token = new Token(tokenAddress.toHexString());
    token.symbol = fetchTokenSymbol(tokenAddress);
    token.name = fetchTokenName(tokenAddress);
    // token.derivedETH = ZERO_BD;

    let decimals = fetchTokenDecimals(tokenAddress);

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
        log.debug('mybug the decimal on token was null', []);
        return null;
    }
    token.decimals = decimals;
    return token;
}
