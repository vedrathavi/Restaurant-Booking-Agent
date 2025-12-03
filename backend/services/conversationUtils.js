// Utility helpers for conversation state and field computation

export function isBookingComplete(data) {
  const hasRequired = !!(
    data.customerName &&
    data.numberOfGuests &&
    data.bookingDate &&
    data.bookingTime
  );
  return hasRequired;
}

export function getMissingFields(data) {
  const required = [
    "customerName",
    "numberOfGuests",
    "bookingDate",
    "bookingTime",
  ];
  return required.filter((field) => !data[field]);
}

export function getOptionalMissingFields(data) {
  const optional = [];
  if (!data.cuisinePreference) optional.push("cuisinePreference");
  if (!data.specialRequests) optional.push("specialRequests");
  return optional;
}
