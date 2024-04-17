import { BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { ZERO_BI, ONE_BI, TEN_BD } from './constants';

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let result = BigDecimal.fromString('1');
    for (let i = ZERO_BI; i.lt(decimals); i = i.plus(ONE_BI)) {
        result = result.times(TEN_BD);
    }
    return result;
}

export function intToDecimal(amount: BigInt, decimals: BigInt): BigDecimal {
    return amount.toBigDecimal().div(exponentToBigDecimal(decimals));
}
