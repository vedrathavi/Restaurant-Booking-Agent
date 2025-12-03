// Common voice intent patterns used across the booking flow

export const patterns = {
  seatingIndoor: /\b(indoor|inside)\b/i,
  seatingOutdoor: /\b(outdoor|outside)\b/i,
  wantsToChange: /(change|edit|modify|update|different|no|wait|actually)/i,
  specifiesField:
    /(date|time|guest|guests|name|cuisine|special|seating|indoor|outdoor)/i,
  positive:
    /(yes|yeah|sure|confirm|proceed|ok|okay|correct|right|perfect|good|looks good)/i,
};

export const isSeatingIndoor = (s = "") => patterns.seatingIndoor.test(s);
export const isSeatingOutdoor = (s = "") => patterns.seatingOutdoor.test(s);
export const userWantsToChange = (s = "") => patterns.wantsToChange.test(s);
export const userSpecifiesField = (s = "") => patterns.specifiesField.test(s);
export const isPositive = (s = "") => patterns.positive.test(s);
