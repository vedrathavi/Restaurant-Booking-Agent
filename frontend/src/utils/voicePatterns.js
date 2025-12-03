// Common voice intent patterns used across the booking flow
// Export helpers for detecting seating preference, modifications, and confirmations.

export const patterns = {
  seatingIndoor: /\b(indoor|inside)\b/i,
  seatingOutdoor: /\b(outdoor|outside)\b/i,
  wantsToChange: /(change|edit|modify|update|different|no|wait|actually)/i,
  specifiesField:
    /(date|time|guest|guests|name|cuisine|special|seating|indoor|outdoor)/i,
  positive:
    /(yes|yeah|sure|confirm|proceed|ok|okay|correct|right|perfect|good|looks good)/i,
};

/** Detects "indoor" preference in the transcript */
export const isSeatingIndoor = (s = "") => patterns.seatingIndoor.test(s);
/** Detects "outdoor" preference in the transcript */
export const isSeatingOutdoor = (s = "") => patterns.seatingOutdoor.test(s);
/** Detects modification intent like "change", "edit", or "actually" */
export const userWantsToChange = (s = "") => patterns.wantsToChange.test(s);
/** Detects if the user specified a particular field to change */
export const userSpecifiesField = (s = "") => patterns.specifiesField.test(s);
/** Detects positive confirmation like "yes", "sure", or "ok" */
export const isPositive = (s = "") => patterns.positive.test(s);
