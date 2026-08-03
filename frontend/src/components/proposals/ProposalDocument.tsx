// Template profissional do PDF de proposta, renderizado apenas no servidor.
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type ProposalPdfData = {
  id: string; operator: string; plan: string; coverage: string; monthlyValue: number;
  lead: { name: string; cpf?: string | null; livesCount: number };
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", color: "#0A1628", fontSize: 10 },
  header: { borderBottomWidth: 2, borderBottomColor: "#C8A96E", paddingBottom: 16, marginBottom: 24 },
  brand: { fontSize: 24, fontFamily: "Helvetica-Bold" }, gold: { color: "#B8935A" },
  section: { marginTop: 18 }, title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 8 },
  label: { width: "35%", color: "#6B7280" }, value: { width: "65%", fontFamily: "Helvetica-Bold" },
  price: { marginTop: 20, padding: 16, backgroundColor: "#F0F4FF", borderLeftWidth: 4, borderLeftColor: "#C8A96E" },
  footer: { position: "absolute", left: 40, right: 40, bottom: 28, borderTopWidth: 1, borderTopColor: "#C8A96E", paddingTop: 8, color: "#6B7280", fontSize: 8 }
});

export function ProposalDocument({ proposal }: { proposal: ProposalPdfData }) {
  const company = process.env.COMPANY_NAME ?? "JD Consultoria e Vendas";
  const validity = new Date(); validity.setDate(validity.getDate() + 30);
  return <Document><Page size="A4" style={styles.page}>
    <View style={styles.header}><Text style={styles.brand}>JD <Text style={styles.gold}>CONSULTORIA</Text></Text><Text>{company} • Campos dos Goytacazes, RJ</Text><Text>{process.env.COMPANY_PHONE ?? ""} {process.env.COMPANY_EMAIL ? `• ${process.env.COMPANY_EMAIL}` : ""}</Text></View>
    <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold" }}>Proposta de plano de saúde</Text>
    <Text>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())} • Validade: {new Intl.DateTimeFormat("pt-BR").format(validity)}</Text>
    <View style={styles.section}><Text style={styles.title}>Cliente</Text><View style={styles.row}><Text style={styles.label}>Nome</Text><Text style={styles.value}>{proposal.lead.name}</Text></View><View style={styles.row}><Text style={styles.label}>CPF</Text><Text style={styles.value}>{proposal.lead.cpf ?? "Não informado"}</Text></View><View style={styles.row}><Text style={styles.label}>Vidas</Text><Text style={styles.value}>{proposal.lead.livesCount}</Text></View></View>
    <View style={styles.section}><Text style={styles.title}>Plano cotado</Text><View style={styles.row}><Text style={styles.label}>Operadora</Text><Text style={styles.value}>{proposal.operator}</Text></View><View style={styles.row}><Text style={styles.label}>Plano</Text><Text style={styles.value}>{proposal.plan}</Text></View><View style={styles.row}><Text style={styles.label}>Cobertura</Text><Text style={styles.value}>{proposal.coverage}</Text></View></View>
    <View style={styles.price}><Text>Valor mensal estimado</Text><Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold" }}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(proposal.monthlyValue)}</Text></View>
    <View style={styles.footer}><Text>Valores, carências, rede credenciada e condições estão sujeitos à confirmação da operadora e às normas da ANS.</Text><Text>CNPJ: {process.env.COMPANY_CNPJ ?? "não informado"} • SUSEP: {process.env.COMPANY_SUSEP ?? "não informado"}</Text></View>
  </Page></Document>;
}

