export type BankId = string;

export interface Bank {
  id: BankId;
  name: string;
  color: string;
  glowClass: string;
  limitTotal: number;
  limitUsed: number;
  debtFinal: number;
  status: "pendente" | "pago" | "parcial" | "cancelado";
  installments: Installment[];
}

export interface Installment {
  id: string;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  dueDate: string;
  status: "pendente" | "pago" | "atrasado";
  category?: string;
}

export interface CashflowItem {
  label: string;
  amount: number;
  paid?: boolean;
  category?: string;
  fixed?: boolean;
}

export interface CashflowMonth {
  month: string;
  year: number;
  incomes: CashflowItem[];
  expenses: CashflowItem[];
}

export interface Creditor {
  id: string;
  name: string;
  totalDebt: number;
  amountPaid: number;
  interestRate?: number; // % ao mês
  dueDate?: string; // YYYY-MM-DD próximo vencimento
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  image: string;
  color: string;
}

export interface MonthlySnapshot {
  month: string;
  debt: number;
  balance: number;
  savings: number;
}

export const banks: Bank[] = [
  {
    id: "nubank",
    name: "Nubank",
    color: "bank-nubank",
    glowClass: "glow-nubank",
    limitTotal: 12000,
    limitUsed: 8750,
    debtFinal: 8750,
    status: "pendente",
    installments: [
      { id: "nu1", description: "iPhone 15 Pro", totalAmount: 6000, installmentAmount: 500, currentInstallment: 4, totalInstallments: 12, dueDate: "2026-03-10", status: "pendente" },
      { id: "nu2", description: "Curso Rocketseat", totalAmount: 2400, installmentAmount: 200, currentInstallment: 6, totalInstallments: 12, dueDate: "2026-03-10", status: "pendente" },
      { id: "nu3", description: "Notebook Dell", totalAmount: 4800, installmentAmount: 400, currentInstallment: 2, totalInstallments: 12, dueDate: "2026-03-15", status: "pendente" },
      { id: "nu4", description: "Assinatura Adobe", totalAmount: 1200, installmentAmount: 100, currentInstallment: 8, totalInstallments: 12, dueDate: "2026-03-05", status: "pago" },
    ],
  },
  {
    id: "inter",
    name: "Inter",
    color: "bank-inter",
    glowClass: "glow-inter",
    limitTotal: 8000,
    limitUsed: 9200,
    debtFinal: 9200,
    status: "pendente",
    installments: [
      { id: "in1", description: "Geladeira Brastemp", totalAmount: 3600, installmentAmount: 300, currentInstallment: 3, totalInstallments: 12, dueDate: "2026-03-12", status: "pendente" },
      { id: "in2", description: "Seguro Auto", totalAmount: 2400, installmentAmount: 200, currentInstallment: 5, totalInstallments: 12, dueDate: "2026-03-12", status: "pendente" },
      { id: "in3", description: "Móveis Sala", totalAmount: 5200, installmentAmount: 433.33, currentInstallment: 1, totalInstallments: 12, dueDate: "2026-04-12", status: "pendente" },
    ],
  },
  {
    id: "c6",
    name: "C6 Bank",
    color: "bank-c6",
    glowClass: "glow-c6",
    limitTotal: 5000,
    limitUsed: 5800,
    debtFinal: 5800,
    status: "pendente",
    installments: [
      { id: "c61", description: "Viagem Nordeste", totalAmount: 4800, installmentAmount: 400, currentInstallment: 2, totalInstallments: 12, dueDate: "2026-03-20", status: "pendente" },
      { id: "c62", description: "Roupas Renner", totalAmount: 1200, installmentAmount: 200, currentInstallment: 4, totalInstallments: 6, dueDate: "2026-03-20", status: "pendente" },
    ],
  },
  {
    id: "itau",
    name: "Itaú",
    color: "bank-itau",
    glowClass: "glow-itau",
    limitTotal: 15000,
    limitUsed: 6300,
    debtFinal: 6300,
    status: "parcial",
    installments: [
      { id: "it1", description: "Reforma Banheiro", totalAmount: 8000, installmentAmount: 666.67, currentInstallment: 3, totalInstallments: 12, dueDate: "2026-03-08", status: "pendente" },
      { id: "it2", description: "TV Samsung 65\"", totalAmount: 3600, installmentAmount: 300, currentInstallment: 7, totalInstallments: 12, dueDate: "2026-03-08", status: "pago" },
    ],
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    color: "bank-bb",
    glowClass: "glow-bb",
    limitTotal: 10000,
    limitUsed: 3200,
    debtFinal: 3200,
    status: "parcial",
    installments: [
      { id: "bb1", description: "Empréstimo Consignado", totalAmount: 12000, installmentAmount: 600, currentInstallment: 9, totalInstallments: 20, dueDate: "2026-03-05", status: "pendente" },
      { id: "bb2", description: "Cartão Compras", totalAmount: 2600, installmentAmount: 260, currentInstallment: 5, totalInstallments: 10, dueDate: "2026-03-15", status: "pendente" },
    ],
  },
];

export const cashflowMonths: CashflowMonth[] = [
  {
    month: "Fevereiro",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: true },
      { label: "Freelance", amount: 1500, paid: true },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: true },
      { label: "Parcelas Cartões", amount: 3600, paid: true },
      { label: "Alimentação", amount: 1100, paid: true },
      { label: "Transporte", amount: 400, paid: true },
      { label: "Lazer", amount: 500, paid: true },
    ],
  },
  {
    month: "Março",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: true },
      { label: "Freelance", amount: 2200, paid: false },
      { label: "Dividendos", amount: 380, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: true },
      { label: "Parcelas Cartões", amount: 3860, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
      { label: "Lazer", amount: 600, paid: false },
    ],
  },
  {
    month: "Abril",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 1800, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 4293, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
    ],
  },
  {
    month: "Maio",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 2500, paid: false },
      { label: "13º (parcela)", amount: 4250, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 4293, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "IPVA", amount: 1800, paid: false },
    ],
  },
  {
    month: "Junho",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 2000, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 3800, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
    ],
  },
  {
    month: "Julho",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 1800, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 3500, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
      { label: "Lazer", amount: 700, paid: false },
    ],
  },
  {
    month: "Agosto",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 2200, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 3200, paid: false },
      { label: "Alimentação", amount: 1250, paid: false },
      { label: "Transporte", amount: 450, paid: false },
    ],
  },
  {
    month: "Setembro",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 1500, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 2900, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
      { label: "Lazer", amount: 500, paid: false },
    ],
  },
  {
    month: "Outubro",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 2000, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 2600, paid: false },
      { label: "Alimentação", amount: 1200, paid: false },
      { label: "Transporte", amount: 450, paid: false },
    ],
  },
  {
    month: "Novembro",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 2500, paid: false },
      { label: "13º (parcela)", amount: 4250, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 2300, paid: false },
      { label: "Alimentação", amount: 1300, paid: false },
      { label: "Transporte", amount: 450, paid: false },
      { label: "Lazer", amount: 800, paid: false },
    ],
  },
  {
    month: "Dezembro",
    year: 2026,
    incomes: [
      { label: "Salário", amount: 8500, paid: false },
      { label: "Freelance", amount: 1800, paid: false },
      { label: "13º (parcela)", amount: 4250, paid: false },
    ],
    expenses: [
      { label: "Aluguel", amount: 2800, paid: false },
      { label: "Parcelas Cartões", amount: 2000, paid: false },
      { label: "Alimentação", amount: 1500, paid: false },
      { label: "Transporte", amount: 450, paid: false },
      { label: "Presentes Natal", amount: 1500, paid: false },
      { label: "Lazer", amount: 1000, paid: false },
    ],
  },
];

export const creditors: Creditor[] = [
  { id: "cr1", name: "João Silva", totalDebt: 5000, amountPaid: 3500, interestRate: 2.5, dueDate: "2026-05-10" },
  { id: "cr2", name: "Maria Souza", totalDebt: 2000, amountPaid: 800, interestRate: 3.2, dueDate: "2026-05-15" },
  { id: "cr3", name: "Pedro Almeida", totalDebt: 3500, amountPaid: 3500, interestRate: 0, dueDate: "2026-04-01" },
  { id: "cr4", name: "Ana Costa", totalDebt: 1500, amountPaid: 500, interestRate: 1.8, dueDate: "2026-05-20" },
];

export const initialGoals: Goal[] = [
  { id: "g1", title: "Viagem Europa", targetAmount: 25000, savedAmount: 8500, image: "✈️", color: "265 80% 50%" },
  { id: "g2", title: "Carro Novo", targetAmount: 60000, savedAmount: 15000, image: "🚗", color: "145 63% 42%" },
  { id: "g3", title: "Fundo de Emergência", targetAmount: 30000, savedAmount: 22000, image: "🛡️", color: "45 100% 50%" },
  { id: "g4", title: "Reforma Casa", targetAmount: 40000, savedAmount: 5000, image: "🏠", color: "27 100% 50%" },
];

export const monthlySnapshots: MonthlySnapshot[] = [
  { month: "Jan", debt: 42000, balance: 2100, savings: 38000 },
  { month: "Fev", debt: 39500, balance: 1800, savings: 40500 },
  { month: "Mar", debt: 33250, balance: 2170, savings: 50500 },
  { month: "Abr", debt: 30800, balance: 1557, savings: 52000 },
  { month: "Mai", debt: 28200, balance: 5157, savings: 56200 },
  { month: "Jun", debt: 25500, balance: 3200, savings: 59000 },
  { month: "Jul", debt: 22800, balance: 4100, savings: 62500 },
  { month: "Ago", debt: 20000, balance: 3800, savings: 65000 },
  { month: "Set", debt: 17500, balance: 4500, savings: 68200 },
  { month: "Out", debt: 15000, balance: 5200, savings: 71000 },
  { month: "Nov", debt: 12000, balance: 6000, savings: 74500 },
  { month: "Dez", debt: 9500, balance: 8500, savings: 78000 },
];
