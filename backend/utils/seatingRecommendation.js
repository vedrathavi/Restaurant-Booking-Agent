// utils/seatingRecommendation.js
// Rule-based logic to recommend indoor vs outdoor seating

/**
 * Rule-based indoor/outdoor recommendation.
 * Prefers indoor for extreme temps or rain; outdoor for pleasant conditions.
 * @param {object} weatherData Normalized forecast entry
 * @returns {"indoor"|"outdoor"}
 */
export function recommendSeating(weatherData) {
  if (!weatherData) return "indoor"; // default safe choice

  const temp = weatherData.temp;
  const condition = weatherData.weather?.main || "";
  const description = weatherData.weather?.description || "";
  const pop = weatherData.pop || 0; // probability of precipitation (0-1)

  // Rules:
  // 1. Rain or snow → indoor
  if (/rain|drizzle|snow|thunderstorm/i.test(condition)) {
    return "indoor";
  }

  // 2. High chance of rain (>40%) → indoor
  if (pop > 0.4) {
    return "indoor";
  }

  // 3. Extreme temperatures → indoor
  if (temp < 10 || temp > 38) {
    return "indoor";
  }

  // 4. Pleasant weather → outdoor
  if (
    temp >= 18 &&
    temp <= 30 &&
    /clear|clouds|few clouds/i.test(description)
  ) {
    return "outdoor";
  }

  // Default fallback
  return "indoor";
}
