// Utility helpers for conversation state and field computation

/**
 * Returns true if all required booking fields are present.
 * Required: customerName, numberOfGuests, bookingDate, bookingTime
 * @param {object} data
 */
export function isBookingComplete(data) {
  const hasRequired = !!(
    data.customerName &&
    data.numberOfGuests &&
    data.bookingDate &&
    data.bookingTime
  );
  return hasRequired;
}

/**
 * Lists missing required fields in the booking data.
 * @param {object} data
 * @returns {string[]} missing field names
 */
export function getMissingFields(data) {
  const required = [
    "customerName",
    "numberOfGuests",
    "bookingDate",
    "bookingTime",
  ];
  return required.filter((field) => !data[field]);
}

/**
 * Lists optional fields that are not yet filled.
 * Optional: cuisinePreference, specialRequests
 * @param {object} data
 * @returns {string[]} missing optional field names
 */
export function getOptionalMissingFields(data) {
  const optional = [];
  if (!data.cuisinePreference) optional.push("cuisinePreference");
  if (!data.specialRequests) optional.push("specialRequests");
  return optional;
}
