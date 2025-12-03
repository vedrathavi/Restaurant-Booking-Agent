// Test weather API fetch
import {
  fetchWeatherForecast,
  findClosestForecast,
} from "./utils/weatherAPI.js";

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 2);
const tomorrowStr = tomorrow.toISOString().split("T")[0];

console.log("Testing weather fetch for:", tomorrowStr, "at 19:00");
console.log("Today is:", today.toISOString().split("T")[0]);

try {
  const data = await fetchWeatherForecast("New Delhi", tomorrowStr);
  console.log("\n✓ Weather API Response:");
  console.log("  - City:", data.city?.name);
  console.log("  - Country:", data.city?.country);
  console.log("  - Forecast entries:", data.list?.length || 0);

  if (data.list && data.list.length > 0) {
    console.log("\nFirst 3 forecast entries:");
    data.list.slice(0, 3).forEach((entry, i) => {
      const dt = new Date(entry.dt * 1000);
      console.log(
        `  [${i + 1}] ${dt.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} - ${entry.main.temp}°C, ${entry.weather[0].main}`
      );
    });

    const closest = findClosestForecast(data, tomorrowStr, "19:00");
    console.log("\n✓ Closest match for tomorrow 19:00:");
    const closestDt = new Date(closest.dt * 1000);
    console.log(
      "  - Time:",
      closestDt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    );
    console.log("  - Temp:", closest.temp + "°C");
    console.log("  - Condition:", closest.weather?.main);
    console.log("  - Description:", closest.weather?.description);
    console.log(
      "  - Rain probability:",
      Math.round((closest.pop || 0) * 100) + "%"
    );

    // Test seating recommendation
    const { recommendSeating } = await import(
      "./utils/seatingRecommendation.js"
    );
    const seating = recommendSeating(closest);
    console.log("  - Recommended seating:", seating);
  }
} catch (err) {
  console.error("✗ Error:", err.message);
}
