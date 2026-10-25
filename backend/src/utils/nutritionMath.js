/**
 * Deterministic math calculations for food portion and nutrient tracking.
 * All base database items store nutrient counts PER 100g (or 100ml).
 */

/**
 * Normalizes a custom unit quantity (e.g. 2 pieces, 1.5 bowls) to absolute weight in grams.
 * 
 * @param {number} quantity - The numeric logged quantity
 * @param {number} conversionToGrams - Weight in grams of exactly 1 unit of this food
 * @returns {number} The normalized weight in grams
 */
function normalizeToGrams(quantity, conversionToGrams) {
  if (!quantity || quantity <= 0) return 0;
  return Number((quantity * conversionToGrams).toFixed(2));
}

/**
 * Calculates nutrients consumed for a specific food portion size.
 * Formula: (Normalized Grams / 100) * Nutrient Value per 100g
 * 
 * @param {number} normalizedGrams - The absolute weight consumed in grams
 * @param {number} nutrientPer100g - Nutrient density (calories, protein, etc.) per 100g
 * @returns {number} Rounded nutrient value
 */
function calculateNutrient(normalizedGrams, nutrientPer100g) {
  if (!normalizedGrams || normalizedGrams <= 0 || !nutrientPer100g) return 0;
  return Number(((normalizedGrams / 100) * nutrientPer100g).toFixed(2));
}

/**
 * Calculates complete macro profile for a single logged item.
 * 
 * @param {number} quantity - Quantity consumed
 * @param {number} conversionToGrams - Conversion factor to grams
 * @param {object} foodNutrients - Object containing calories, protein, carbs, fat, fiber
 * @returns {object} Calculated totals
 */
function calculateItemNutrients(quantity, conversionToGrams, foodNutrients) {
  const normalizedGrams = normalizeToGrams(quantity, conversionToGrams);
  
  return {
    normalizedGrams,
    calories: calculateNutrient(normalizedGrams, foodNutrients.caloriesPer100g),
    protein: calculateNutrient(normalizedGrams, foodNutrients.proteinPer100g),
    carbs: calculateNutrient(normalizedGrams, foodNutrients.carbsPer100g),
    fat: calculateNutrient(normalizedGrams, foodNutrients.fatPer100g),
    fiber: calculateNutrient(normalizedGrams, foodNutrients.fiberPer100g),
    sodium: calculateNutrient(normalizedGrams, foodNutrients.sodiumPer100g || 0)
  };
}

/**
 * Sums nutrient values across multiple meal items to get total plate calculations.
 * 
 * @param {Array} items - List of calculated meal items
 * @returns {object} Summed total nutrition object
 */
function calculateMealTotals(items) {
  const totals = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    totalSodium: 0
  };

  if (!Array.isArray(items)) return totals;

  items.forEach(item => {
    totals.totalCalories += item.calories || 0;
    totals.totalProtein += item.protein || 0;
    totals.totalCarbs += item.carbs || 0;
    totals.totalFat += item.fat || 0;
    totals.totalFiber += item.fiber || 0;
    totals.totalSodium += item.sodium || 0;
  });

  // Round results to 2 decimal places
  Object.keys(totals).forEach(key => {
    totals[key] = Number(totals[key].toFixed(2));
  });

  return totals;
}

module.exports = {
  normalizeToGrams,
  calculateNutrient,
  calculateItemNutrients,
  calculateMealTotals
};
