import { describe, expect, it } from "vitest";
import { annualIncomeChartData } from "@/components/AnnualIncomeChart";

describe("annual income chart", () => {
  it("accumulates confirmed values to the last recorded month without projecting future months", () => {
    const values = annualIncomeChartData([100.1, 0, 50.2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(values.map(item => item.acumulado)).toEqual([100.1, 100.1, 150.3, null, null, null, null, null, null, null, null, null]);
  });
  it("keeps the chart empty without confirmed amounts and represents corrections", () => {
    expect(annualIncomeChartData(Array(12).fill(0)).every(item => item.acumulado === null)).toBe(true);
    expect(annualIncomeChartData([10, -20]).slice(0, 3).map(item => item.acumulado)).toEqual([10, -10, null]);
  });
});
