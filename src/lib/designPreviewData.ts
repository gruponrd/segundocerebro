import type { PersistedData } from "@/stores/financeStore";
/** Synthetic records, used only by the isolated Vite design mode. Never migrated to an account. */
export function createDesignPreviewData(): PersistedData {
 const now=new Date(); const year=now.getFullYear();
 const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
 const date=(month:number,day:number)=>`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
 return {
 banks:[
  {id:"demo-blue",name:"Cartão principal",color:"#153c73",glowClass:"",limitTotal:8000,limitUsed:2580,debtFinal:2580,status:"pendente",installments:[{id:"demo-parcel-1",description:"Notebook · demonstração",totalAmount:2580,installmentAmount:860,currentInstallment:1,totalInstallments:3,dueDate:date(now.getMonth(),17),status:"pendente",category:"eletronicos"}]},
  {id:"demo-purple",name:"Cartão roxo",color:"bank-nubank",glowClass:"glow-nubank",limitTotal:5000,limitUsed:360,debtFinal:360,status:"pendente",installments:[{id:"demo-parcel-2",description:"Curso · demonstração",totalAmount:360,installmentAmount:120,currentInstallment:1,totalInstallments:3,dueDate:date(now.getMonth(),22),status:"pendente",category:"educacao"}]},
  {id:"demo-orange",name:"Cartão laranja",color:"bank-inter",glowClass:"glow-inter",limitTotal:3000,limitUsed:0,debtFinal:0,status:"pago",installments:[]}
 ],
 cashflowMonths:months.map((month,index)=>({month,year,
  incomes:index<now.getMonth()-2?[]:[{id:`demo-salary-${index}`,label:"Salário",amount:5000,paid:index<=now.getMonth(),date:date(index,5),fixed:true},{id:`demo-extra-${index}`,label:"Projeto extra",amount:1000,paid:index<now.getMonth(),date:date(index,20)}],
  expenses:index<now.getMonth()-2?[]:[{id:`demo-home-${index}`,label:"Moradia",amount:1800,paid:index<=now.getMonth(),date:date(index,10),category:"moradia",fixed:true},{id:`demo-food-${index}`,label:"Mercado",amount:650,paid:index<=now.getMonth(),date:date(index,12),category:"alimentacao"},{id:`demo-net-${index}`,label:"Internet",amount:140,paid:index<now.getMonth(),date:date(index,20),category:"contas",fixed:true},{id:`demo-trip-${index}`,label:"Transporte",amount:330,paid:index<now.getMonth(),date:date(index,25),category:"transporte"}]
 })),
 creditors:[{id:"demo-creditor",name:"Empréstimo pessoal · exemplo",totalDebt:2400,amountPaid:600,interestRate:1.2,dueDate:date(now.getMonth(),28)}],
 goals:[{id:"demo-reserve",title:"Reserva de segurança",targetAmount:5000,savedAmount:2100,image:"🌱",color:"215 100% 71%",monthlyAllocation:300},{id:"demo-trip",title:"Próxima viagem",targetAmount:2000,savedAmount:1300,image:"✈️",color:"265 65% 75%",monthlyAllocation:200}],
 incomeSources:[{id:"demo-income-1",label:"Salário",amount:5000},{id:"demo-income-2",label:"Projeto extra",amount:1000}],
 savingsGoalMonth:500,salary:5000,monthlyHours:220,safetyMargin:500,lifeXp:120,
 lifeTasks:[{id:"demo-task-1",title:"Revisar os gastos da semana",xpReward:20,completedThisWeek:false},{id:"demo-task-2",title:"Reservar um tempo para caminhar",xpReward:15,completedThisWeek:true}],
 transportEntries:[],transportBalance:150
 };
}
