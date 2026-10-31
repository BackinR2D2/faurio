export const PLATFORM_FEE_BPS = 550;
export const PLATFORM_FEE_LABEL = "5,5%";
export const FEE_POLICY_VERSION = "seller-2026-10-31";

export function calculateSellerAmounts(productSubtotalMinor: number, shippingMinor: number) {
  if (![productSubtotalMinor, shippingMinor].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_MONEY");
  const commissionMinor = Math.round(productSubtotalMinor * PLATFORM_FEE_BPS / 10000);
  return { commissionMinor, sellerTransferMinor: productSubtotalMinor + shippingMinor - commissionMinor };
}

export function singleCheckoutShop(products: Array<{ shopId?: string }>) {
  const shops = new Set(products.map((product) => product.shopId || "legacy"));
  if (shops.size !== 1) throw new Error("Achită produsele fiecărui atelier separat. Celelalte rămân în coș.");
  return [...shops][0];
}

export function cartShippingByMaker(lines: Array<{product:{shopId?:string;price:number};quantity:number}>) {
  const subtotals=new Map<string,number>();
  for(const line of lines){const key=line.product.shopId||"legacy";subtotals.set(key,(subtotals.get(key)||0)+line.product.price*line.quantity);}
  return {makers:subtotals.size,shipping:[...subtotals.values()].reduce((sum,subtotal)=>sum+(subtotal>=250?0:19),0)};
}
