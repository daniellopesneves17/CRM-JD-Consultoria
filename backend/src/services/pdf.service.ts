// Renderiza propostas em PDF. Em produção, envie o Buffer para seu storage e salve a URL.
import puppeteer from "puppeteer";

export type ProposalPdfData = {
  leadName: string; operator: string; plan: string; coverage: string;
  monthlyValue: number; lives: Array<{ idade: number; valor: number }>;
};

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);

export class PdfService {
  async generate(data: ProposalPdfData): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
        body{font-family:Arial;color:#0f172a;padding:48px}h1{color:#1d4ed8}.card{border:1px solid #cbd5e1;border-radius:12px;padding:24px;margin-top:24px}
        table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.price{font-size:28px;font-weight:700;color:#16a34a}
      </style></head><body><p>Proposta personalizada</p><h1>${esc(data.leadName)}</h1><div class="card">
        <h2>${esc(data.operator)} — ${esc(data.plan)}</h2><p>Abrangência: ${esc(data.coverage)}</p>
        <p class="price">${data.monthlyValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</p>
        <table><thead><tr><th>Idade</th><th>Valor</th></tr></thead><tbody>${data.lives.map((life) => `<tr><td>${life.idade}</td><td>${life.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("")}</tbody></table>
      </div><p>Valores sujeitos à confirmação cadastral da operadora.</p></body></html>`);
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

