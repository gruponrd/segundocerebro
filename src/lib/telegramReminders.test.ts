import { expect, it, vi } from "vitest";
import { dueReminders, processReminderBatch, reminderClock, reminderMessage, type ReminderBackend } from "../../supabase/functions/_shared/telegramReminders";
it("usa a virada do dia e hora de Brasília",()=> {
  expect(reminderClock(new Date("2026-10-11T02:30:00Z"))).toEqual({day:"2026-10-10",hour:23});
  expect(reminderClock(new Date("2026-10-11T12:00:00Z"))).toEqual({day:"2026-10-11",hour:9});
});
it("inclui somente parcelas pendentes e dívida residual no período",()=> {
  const inst = {id:"i",description:"Compra",dueDate:"2026-10-11",status:"pendente",installmentAmount:20};
  const data = {banks:[{id:"b",name:"Banco",status:"pendente",installments:[inst,{...inst,id:"p",status:"pago"},{...inst,id:"old",dueDate:"2026-10-09"},{...inst,id:"far",dueDate:"2026-10-20"}]},{id:"c",name:"Cancelado",status:"cancelado",installments:[inst]}],creditors:[{id:"cr",name:"Credor",totalDebt:100,amountPaid:25,dueDate:"2026-10-13"},{id:"no",name:"Sem data",totalDebt:20,amountPaid:0}]};
  const before = JSON.stringify(data);
  expect(dueReminders(data,"2026-10-10",3).map(i=>i.amount)).toEqual([20,75]);
  expect(dueReminders(data,"2026-10-10",0)).toEqual([]);
  expect(JSON.stringify(data)).toBe(before);
});
it("exclui datas e valores inválidos",()=> {
  const data = {creditors:[{id:"c",name:"Credor",totalDebt:100,amountPaid:0,dueDate:"2026-02-30"}]};
  expect(dueReminders(data,"2026-02-28",3)).toEqual([]);
  expect(()=>dueReminders(data,"invalid",3)).toThrow();
});
it("valores só aparecem quando autorizados e texto não injeta linhas",()=> {
  const items = [{id:"1",title:"Compra\nlinha",source:"Banco",dueDate:"2026-10-10",amount:45.9}];
  expect(reminderMessage(items,false)).not.toContain("R$");
  expect(reminderMessage(items,true)).toContain("45,90");
  expect(reminderMessage(items,true)).toContain("Compra linha");
});
it("limita o resumo para caber em uma mensagem do Telegram",()=> {
  const items = Array.from({length:40},(_,i)=>({id:String(i),title:"a".repeat(240),source:"b".repeat(240),dueDate:"2026-10-10",amount:1_000_000}));
  expect(reminderMessage(items,true).length).toBeLessThan(4096);
  expect(reminderMessage(items,true)).toContain("+ 25 pendência(s)");
});

const fixture = () => {
  const finance={creditors:[{id:"c",name:"Credor",totalDebt:100,amountPaid:0,dueDate:"2026-10-10"}]};
  let claimed=false;
  const live={enabled:true,hour:9,daysAhead:3,includeAmounts:false,chatId:10,finance};
  const backend: ReminderBackend={finance:vi.fn(async()=>finance),claim:vi.fn(async()=>{ if(claimed) return null; claimed=true; return {chatId:10,ticket:"ticket"}; }),live:vi.fn(async()=>live),send:vi.fn(async()=>true),finish:vi.fn(async()=>{})};
  return {backend,live};
};
const candidates=[{user_id:"account",days_ahead:3}], clock={day:"2026-10-10",hour:9};
it("dry run não reserva envios nem chama o Telegram",async()=>{
  const {backend}=fixture();
  expect(await processReminderBatch(candidates,clock,true,backend)).toMatchObject({eligible:1,sent:0});
  expect(backend.claim).not.toHaveBeenCalled(); expect(backend.send).not.toHaveBeenCalled(); expect(backend.finish).not.toHaveBeenCalled();
});
it("execuções concorrentes enviam no máximo uma vez à conta reservada",async()=>{
  const {backend}=fixture();
  await Promise.all([processReminderBatch(candidates,clock,false,backend),processReminderBatch(candidates,clock,false,backend)]);
  expect(backend.send).toHaveBeenCalledTimes(1); expect(backend.send).toHaveBeenCalledWith(10,expect.any(String));
  expect(backend.finish).toHaveBeenCalledWith("account","2026-10-10","ticket",true);
});
it.each(["disabled","disconnected","paid","hour"])("revalida %s antes do envio",async reason=>{
  const {backend,live}=fixture();
  if(reason==="disabled") live.enabled=false;
  if(reason==="disconnected") live.chatId=20;
  if(reason==="paid") live.finance.creditors[0].amountPaid=100;
  if(reason==="hour") live.hour=10;
  await processReminderBatch(candidates,clock,false,backend);
  expect(backend.send).not.toHaveBeenCalled();
});
it("timeout no Telegram é registrado sem repetição automática",async()=>{
  const {backend}=fixture(); vi.mocked(backend.send).mockRejectedValue(new Error("timeout"));
  expect((await processReminderBatch(candidates,clock,false,backend)).failed).toBe(1);
  await processReminderBatch(candidates,clock,false,backend);
  expect(backend.send).toHaveBeenCalledTimes(1); expect(backend.finish).toHaveBeenCalledWith("account","2026-10-10","ticket",false);
});
