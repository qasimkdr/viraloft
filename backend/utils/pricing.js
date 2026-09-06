const COMMISSION_RATE = 0.20;
const COMMISSION_MULTIPLIER = 1 + COMMISSION_RATE;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, decimals = 6) => Number(toNumber(value).toFixed(decimals));

const isPerItemService = (service) => {
  const min = toNumber(service?.min, 1);
  const max = toNumber(service?.max, 1000);
  if (min === 1 && max === 1) return true;

  const text = [service?.type, service?.name, service?.category]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');

  return /package|software|license/.test(text);
};

const getSellRate = (baseRate) => round(toNumber(baseRate) * COMMISSION_MULTIPLIER, 6);

const priceService = (service) => {
  const rate = toNumber(service?.rate, 0);
  return {
    ...service,
    rate,
    markupRate: getSellRate(rate),
    commissionPercent: COMMISSION_RATE * 100,
  };
};

const computeQuote = (service, requestedQuantity) => {
  const min = toNumber(service?.min, 1);
  const max = toNumber(service?.max, 1000000);
  const quantity = Math.min(Math.max(toNumber(requestedQuantity, 1), min), max);
  const baseRateUSD = toNumber(service?.rate, NaN);

  if (!Number.isFinite(baseRateUSD)) {
    const error = new Error('Invalid service rate');
    error.status = 400;
    throw error;
  }

  const perItem = isPerItemService(service);
  const basePriceUSD = perItem
    ? baseRateUSD * quantity
    : baseRateUSD * (quantity / 1000);
  const commissionUSD = round(basePriceUSD * COMMISSION_RATE);
  const totalUSD = round(basePriceUSD + commissionUSD);

  return {
    quantity,
    rateType: perItem ? 'per_item' : 'per_1000',
    baseRateUSD,
    sellRateUSD: getSellRate(baseRateUSD),
    basePriceUSD: round(basePriceUSD),
    commissionPercent: COMMISSION_RATE * 100,
    commissionUSD,
    totalUSD,
    perUnitUSD: quantity > 0 ? round(totalUSD / quantity) : 0,
  };
};

module.exports = {
  COMMISSION_RATE,
  COMMISSION_MULTIPLIER,
  computeQuote,
  getSellRate,
  isPerItemService,
  priceService,
  round,
  toNumber,
};
