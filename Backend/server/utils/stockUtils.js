/**
 * Shared stock utility — used by orders.js and orderController.js
 */

/**
 * Returns grams to deduct/restore for weight-based products, or null for count-based.
 * @param {Object} product - Mongoose product document
 * @param {Object|null} opt - selectedOption from order item
 * @param {number} qty - quantity ordered
 * @returns {number|null} grams to deduct, or null if count-based
 */
const calcDeductGrams = (product, opt, qty) => {
  const isWeightProduct =
    product.unitType === 'weight' ||
    product.stockUnit === 'kg' ||
    product.stockUnit === 'gram';

  if (!isWeightProduct || !opt) return null;

  const optValue = Number(opt.value);
  const optUnit  = (opt.unit || '').toLowerCase();

  if (optValue > 0) {
    return (optUnit === 'kg' ? optValue * 1000 : optValue) * qty;
  }

  // Fallback: parse weight from label string
  const label    = String(opt.label || '');
  const kgMatch  = label.match(/(\d+\.?\d*)\s*kg/i);
  const gMatch   = label.match(/(\d+\.?\d*)\s*g(?:ram)?s?/i);
  const numMatch = label.match(/^(\d+\.?\d*)$/);

  if (kgMatch)  return Number(kgMatch[1])  * 1000 * qty;
  if (gMatch)   return Number(gMatch[1])   * qty;
  if (numMatch) return Number(numMatch[1]) * qty; // bare number → always grams

  return null;
};

module.exports = { calcDeductGrams };
