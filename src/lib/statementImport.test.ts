import { describe, expect, it } from "vitest";
import { appendStatement, parseStatementCsv, previewStatement, statementAmount, statementDate, suggestMapping, undoStatement } from "./statementImport";
import type { CashflowMonth } from "@/data/financialData";
const months: CashflowMonth[] = [{ month:"Outubro",year:2026,incomes:[{label:"Salário",amount:1000,paid:true}],expenses:[{label:"Original",amount:20,category:"outros"}] }];
const preview = (csv: string, existing = months) => { const rows = parseStatementCsv(csv); return previewStatement(rows,suggestMapping(rows[0]),"br","signed",existing); };
describe("importação de extratos",() => {
  it("lê BOM, aspas escapadas, delimitador e quebra de linha dentro da descrição",() => {
    const rows = parseStatementCsv('\uFEFFdata;descrição;valor\r\n10/10/2026;"Mercado; ""centro""\ncompra";-12,34');
    expect(rows[1]).toEqual(["10/10/2026",'Mercado; "centro"\ncompra',"-12,34"]);
  });
  it("rejeita aspas abertas, arquivos grandes e linhas acima do limite",() => {
    expect(() => parseStatementCsv('data;valor\n"aberto;3')).toThrow();
    expect(() => parseStatementCsv("a".repeat(1_000_001))).toThrow();
    expect(() => parseStatementCsv("a;b\n" + "x;1\n".repeat(1001))).toThrow();
  });
  it("valida calendário sem transformar datas inexistentes",() => {
    expect(statementDate("29/02/2024")).toBe("2024-02-29");
    expect(statementDate("29/02/2026")).toBeNull();
    expect(statementDate("2026-04-31")).toBeNull();
    expect(statementDate("10/10/26")).toBeNull();
  });
  it("não interpreta vírgulas e pontos silenciosamente no formato errado",() => {
    expect(statementAmount("R$ -1.234,56","br")).toBe(-1234.56);
    expect(statementAmount("(12,34)","br")).toBe(-12.34);
    expect(statementAmount("1234.56","decimal")).toBe(1234.56);
    expect(statementAmount("12.34","br")).toBeNull();
    expect(statementAmount("0","br")).toBeNull();
    expect(statementAmount("Infinity","decimal")).toBeNull();
  });
  it("identifica repetição no arquivo e correspondência conservadora com registros antigos sem data",() => {
    const rows = preview("data;descricao;valor\n10/10/2026;original;-20\n11/10/2026;Café;-5\n11/10/2026;  CAFE  ;-5");
    expect(rows[0].duplicate).toContain("Fluxo");
    expect(rows[1].duplicate).toBeUndefined();
    expect(rows[2].duplicate).toContain("CSV");
    expect(months[0].expenses).toHaveLength(1);
  });
  it("usa tipo explícito e sinal ou regra para faturas",() => {
    const rows = parseStatementCsv("date,title,amount,tipo\n2026-10-10,Compra,15.50,despesa");
    expect(previewStatement(rows,suggestMapping(rows[0]),"decimal","signed",[])[0].entry?.kind).toBe("expenses");
    const card = parseStatementCsv("date,title,amount\n2026-10-10,Compra,15.50");
    expect(previewStatement(card,suggestMapping(card[0]),"decimal","expenses",[])[0].entry?.kind).toBe("expenses");
  });
  it("anexa a meses novos, preserva originais e reimportação não duplica",() => {
    const snapshot = structuredClone(months);
    const entries = preview("data;descricao;valor\n10/10/2026;Café;-5,20\n01/01/2027;Extra;25").map(r=>r.entry!);
    const saved = appendStatement(months,entries,"batch",true);
    expect(months).toEqual(snapshot);
    expect(saved[0].expenses[0]).toEqual(snapshot[0].expenses[0]);
    expect(saved[0].incomes).toEqual(snapshot[0].incomes);
    expect(saved[1].year).toBe(2027);
    expect(saved[0].expenses[1]).toMatchObject({id:"csv:batch:2",date:"2026-10-10",paid:true,amount:5.2});
    expect(appendStatement(saved,entries,"another",true)).toEqual(saved);
    expect(undoStatement(saved,"batch")[0]).toEqual(snapshot[0]);
    expect(undoStatement(saved,"other")).toEqual(saved);
  });
  it("faz nova checagem contra lançamentos inseridos entre a prévia e confirmação",() => {
    const entry = preview("data;descricao;valor\n10/10/2026;Café;-5")[0].entry!;
    const latest = structuredClone(months); latest[0].expenses.push({label:"Café",amount:5});
    expect(appendStatement(latest,[entry],"batch",true)).toEqual(latest);
  });
});
