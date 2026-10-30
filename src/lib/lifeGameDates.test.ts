import { expect, it } from "vitest";
import { journeyDate, journeyDays, journeyToday, validJourneyDate } from "./lifeGameDates";

it("uses the calendar day in Brasília even after midnight UTC", () => {
  expect(journeyToday(new Date("2026-10-30T01:30:00Z"))).toBe("2026-10-29");
});
it("counts calendar boundaries rather than complete 24-hour intervals", () => {
  expect(journeyDays("2026-10-28", new Date("2026-10-30T02:59:59Z"))).toBe(1);
  expect(journeyDays("2026-10-28", new Date("2026-10-30T03:00:00Z"))).toBe(2);
});
it("keeps legacy ISO date prefixes readable without converting or rewriting them", () => {
  for (const value of ["2026-09-19T03:00:00.000Z", "2026-09-19T00:00:00.000Z", "2026-09-19"]) {
    expect(journeyDate(value)).toBe("2026-09-19");
    expect(journeyDays(value, new Date("2026-10-29T18:00:00Z"))).toBe(40);
  }
});
it("handles historical daylight-saving transitions as calendar days", () => {
  expect(journeyDays("2018-11-03", new Date("2018-11-05T03:00:00Z"))).toBe(2);
});
it("rejects blank, malformed and impossible dates and clamps future dates", () => {
  for (const value of ["", "2026-02-30", "2026-13-01", "not-a-date", "2026-10-29invalid"]) expect(journeyDate(value)).toBeNull();
  expect(validJourneyDate("2028-02-29")).toBe(true);
  expect(validJourneyDate("2026-02-29")).toBe(false);
  expect(journeyDays("2027-01-01", new Date("2026-10-29T18:00:00Z"))).toBe(0);
});
