from __future__ import annotations

import html
import os
from datetime import datetime
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    LongTable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "relatorio-completo-crm-jd-2026-08-12.pdf"
LOGO = ROOT / "frontend" / "public" / "jd-logo.png"

NAVY = colors.HexColor("#07162D")
NAVY_2 = colors.HexColor("#0D2447")
BLUE = colors.HexColor("#1D4ED8")
BLUE_LIGHT = colors.HexColor("#EAF1FF")
GOLD = colors.HexColor("#C49A38")
GOLD_LIGHT = colors.HexColor("#FBF5E7")
GREEN = colors.HexColor("#0F9D6E")
GREEN_LIGHT = colors.HexColor("#E7F7F1")
AMBER = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FFF4DB")
RED = colors.HexColor("#C2413A")
RED_LIGHT = colors.HexColor("#FDECEC")
SLATE = colors.HexColor("#526175")
SLATE_2 = colors.HexColor("#77869A")
LINE = colors.HexColor("#DCE3EC")
PAPER = colors.HexColor("#F5F7FA")
WHITE = colors.white


def register_fonts() -> tuple[str, str]:
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("CRM-Regular", str(regular)))
        pdfmetrics.registerFont(TTFont("CRM-Bold", str(bold)))
        return "CRM-Regular", "CRM-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()
PAGE_W, PAGE_H = A4


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverEyebrow", fontName=FONT_BOLD, fontSize=9, leading=12,
    textColor=GOLD, alignment=TA_CENTER, spaceAfter=6, tracking=1.6,
))
styles.add(ParagraphStyle(
    name="CoverTitle", fontName=FONT_BOLD, fontSize=28, leading=33,
    textColor=WHITE, alignment=TA_CENTER, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="CoverSub", fontName=FONT, fontSize=11, leading=17,
    textColor=colors.HexColor("#CBD7E8"), alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    name="H1CRM", fontName=FONT_BOLD, fontSize=21, leading=26,
    textColor=NAVY, spaceAfter=10, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="H2CRM", fontName=FONT_BOLD, fontSize=14, leading=18,
    textColor=NAVY_2, spaceBefore=8, spaceAfter=7, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="H3CRM", fontName=FONT_BOLD, fontSize=10.5, leading=14,
    textColor=BLUE, spaceBefore=5, spaceAfter=4, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="BodyCRM", fontName=FONT, fontSize=9.1, leading=13.5,
    textColor=colors.HexColor("#26364B"), spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="SmallCRM", fontName=FONT, fontSize=7.7, leading=10.5,
    textColor=SLATE,
))
styles.add(ParagraphStyle(
    name="TinyCRM", fontName=FONT, fontSize=6.8, leading=9,
    textColor=SLATE,
))
styles.add(ParagraphStyle(
    name="TableHeadCRM", fontName=FONT_BOLD, fontSize=7.3, leading=9,
    textColor=WHITE,
))
styles.add(ParagraphStyle(
    name="TableCRM", fontName=FONT, fontSize=7.1, leading=9.4,
    textColor=colors.HexColor("#26364B"),
))
styles.add(ParagraphStyle(
    name="TableBoldCRM", fontName=FONT_BOLD, fontSize=7.1, leading=9.4,
    textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="CalloutCRM", fontName=FONT, fontSize=8.5, leading=12.5,
    textColor=NAVY_2,
))


def para(text: str, style: str = "BodyCRM") -> Paragraph:
    return Paragraph(text, styles[style])


def esc(text: object) -> str:
    return html.escape(str(text)).replace("\n", "<br/>")


def badge(label: str) -> Table:
    palette = {
        "FUNCIONA": (GREEN_LIGHT, GREEN),
        "PARCIAL": (AMBER_LIGHT, AMBER),
        "NÃO FUNCIONA": (RED_LIGHT, RED),
        "ATENÇÃO": (RED_LIGHT, RED),
        "INFORMATIVO": (BLUE_LIGHT, BLUE),
    }
    bg, fg = palette.get(label, (PAPER, SLATE))
    t = Table([[Paragraph(label, ParagraphStyle(
        "badge", parent=styles["TinyCRM"], fontName=FONT_BOLD,
        fontSize=6.5, leading=8, textColor=fg, alignment=TA_CENTER,
    ))]], colWidths=[25 * mm], rowHeights=[6 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, fg),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def section_title(number: str, title: str, subtitle: str | None = None):
    items = [para(f"{number}  {esc(title)}", "H1CRM")]
    if subtitle:
        items.append(para(esc(subtitle), "BodyCRM"))
    items.append(Spacer(1, 2 * mm))
    return items


def callout(title: str, text: str, tone: str = "blue") -> Table:
    bg, bar = {
        "blue": (BLUE_LIGHT, BLUE),
        "gold": (GOLD_LIGHT, GOLD),
        "green": (GREEN_LIGHT, GREEN),
        "red": (RED_LIGHT, RED),
    }[tone]
    cell = para(f"<b>{esc(title)}</b><br/>{esc(text)}", "CalloutCRM")
    t = Table([["", cell]], colWidths=[3 * mm, 163 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BACKGROUND", (0, 0), (0, 0), bar),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.Color(bar.red, bar.green, bar.blue, alpha=0.35)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
        ("RIGHTPADDING", (1, 0), (1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def kpi_cards(items: list[tuple[str, str, str]]) -> Table:
    cells = []
    for value, label, tone in items:
        color = {"green": GREEN, "amber": AMBER, "red": RED, "blue": BLUE, "gold": GOLD}[tone]
        cells.append(Table([
            [Paragraph(esc(value), ParagraphStyle("kpi-v", fontName=FONT_BOLD, fontSize=18, leading=21, textColor=color))],
            [Paragraph(esc(label), ParagraphStyle("kpi-l", fontName=FONT, fontSize=7.6, leading=10, textColor=SLATE))],
        ], colWidths=[38 * mm]))
    table = Table([cells], colWidths=[42 * mm] * len(cells), rowHeights=[24 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def matrix(rows: list[tuple[str, str, str, str]], widths=None, repeat=True) -> LongTable:
    widths = widths or [35 * mm, 27 * mm, 60 * mm, 45 * mm]
    data = [[
        para("Item", "TableHeadCRM"), para("Estado", "TableHeadCRM"),
        para("O que foi verificado", "TableHeadCRM"), para("Limite atual", "TableHeadCRM"),
    ]]
    for name, status, evidence, gap in rows:
        data.append([
            para(esc(name), "TableBoldCRM"), badge(status),
            para(esc(evidence), "TableCRM"), para(esc(gap), "TableCRM"),
        ])
    table = LongTable(data, colWidths=widths, repeatRows=1 if repeat else 0, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY_2),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for idx in range(1, len(data)):
        if idx % 2 == 0:
            style.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F8FAFC")))
    table.setStyle(TableStyle(style))
    return table


def simple_table(headers: list[str], rows: list[list[object]], widths, small=False) -> LongTable:
    body_style = "TinyCRM" if small else "TableCRM"
    data = [[para(esc(h), "TableHeadCRM") for h in headers]]
    for row in rows:
        data.append([para(esc(value), body_style) for value in row])
    t = LongTable(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY_2),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for idx in range(2, len(data), 2):
        commands.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F8FAFC")))
    t.setStyle(TableStyle(commands))
    return t


def architecture_drawing() -> Drawing:
    d = Drawing(470, 185)
    boxes = [
        (8, 118, 86, 44, "Navegador", "Next.js UI", BLUE),
        (118, 118, 92, 44, "Vercel", "Next.js APIs", NAVY_2),
        (238, 118, 86, 44, "Prisma 6", "ORM", GOLD),
        (352, 118, 108, 44, "Supabase", "Postgres crm", GREEN),
        (118, 33, 92, 44, "Cron diário", "12:00 UTC", NAVY_2),
        (238, 33, 66, 44, "OpenAI", "sem chave", RED),
        (316, 33, 66, 44, "Uazapi", "sem token", RED),
        (394, 33, 66, 44, "Storage", "sem chave", AMBER),
    ]
    for x, y, w, h, top, bottom, color in boxes:
        d.add(Rect(x, y, w, h, rx=7, ry=7, fillColor=colors.Color(color.red, color.green, color.blue, alpha=0.10), strokeColor=color, strokeWidth=1.1))
        d.add(String(x + w / 2, y + 26, top, fontName=FONT_BOLD, fontSize=8.5, textAnchor="middle", fillColor=color))
        d.add(String(x + w / 2, y + 12, bottom, fontName=FONT, fontSize=7.2, textAnchor="middle", fillColor=SLATE))
    for x1, y1, x2, y2 in [(94, 140, 118, 140), (210, 140, 238, 140), (324, 140, 352, 140), (164, 77, 164, 118), (210, 55, 238, 55), (304, 55, 316, 55), (382, 55, 394, 55)]:
        d.add(Rect(x1, y1 - 0.7, max(1, x2 - x1), 1.4, fillColor=SLATE_2, strokeColor=None))
    d.add(String(235, 174, "Aplicação atual: um único serviço Next.js", fontName=FONT_BOLD, fontSize=9, textAnchor="middle", fillColor=NAVY))
    return d


class CRMDocTemplate(BaseDocTemplate):
    pass


def page_background(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setFillColor(GOLD)
        canvas.rect(0, 0, PAGE_W, 7 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#0B2142"))
        canvas.circle(PAGE_W * 0.15, PAGE_H * 0.82, 65 * mm, fill=1, stroke=0)
        canvas.circle(PAGE_W * 0.88, PAGE_H * 0.22, 55 * mm, fill=1, stroke=0)
    else:
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(22 * mm, PAGE_H - 18 * mm, PAGE_W - 22 * mm, PAGE_H - 18 * mm)
        canvas.setFont(FONT_BOLD, 7.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(22 * mm, PAGE_H - 13 * mm, "CRM JD CONSULTORIA")
        canvas.setFont(FONT, 7.2)
        canvas.setFillColor(SLATE)
        canvas.drawRightString(PAGE_W - 22 * mm, PAGE_H - 13 * mm, "Relatório funcional e técnico - 12/08/2026")
        canvas.line(22 * mm, 15 * mm, PAGE_W - 22 * mm, 15 * mm)
        canvas.setFont(FONT, 6.8)
        canvas.drawString(22 * mm, 10 * mm, "Auditoria local + Supabase + produção. Segredos omitidos.")
        canvas.drawRightString(PAGE_W - 22 * mm, 10 * mm, f"Página {doc.page}")
    canvas.restoreState()


def build_story():
    story = []

    story.append(Spacer(1, 28 * mm))
    if LOGO.exists():
        logo = Image(str(LOGO), width=46 * mm, height=46 * mm)
        logo.hAlign = "CENTER"
        story.append(logo)
    story.append(Spacer(1, 10 * mm))
    story.append(para("AUDITORIA DO ESTADO ATUAL", "CoverEyebrow"))
    story.append(para("Relatório completo do CRM", "CoverTitle"))
    story.append(para("JD Consultoria e Vendas", "CoverTitle"))
    story.append(Spacer(1, 5 * mm))
    story.append(para("O que funciona, o que funciona parcialmente e o que ainda não está operacional", "CoverSub"))
    story.append(Spacer(1, 23 * mm))
    cover_meta = Table([
        [para("DATA DA AUDITORIA", "TinyCRM"), para("12 de agosto de 2026", "SmallCRM")],
        [para("ESCOPO", "TinyCRM"), para("Workspace local, Supabase e produção Vercel", "SmallCRM")],
        [para("BRANCH LOCAL", "TinyCRM"), para("codex/admin-user-management", "SmallCRM")],
        [para("COMMIT BASE", "TinyCRM"), para("e5aedb5", "SmallCRM")],
    ], colWidths=[38 * mm, 82 * mm])
    cover_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10294E")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#34527A")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#34527A")),
        ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    cover_meta.hAlign = "CENTER"
    story.append(cover_meta)
    story.append(PageBreak())

    story += section_title("01", "Resumo executivo", "Conclusão direta sobre a condição atual do sistema.")
    story.append(kpi_cards([
        ("12", "áreas funcionais verificadas", "green"),
        ("8", "áreas parciais ou sem dados", "amber"),
        ("7", "bloqueios e funções não ligadas", "red"),
        ("200", "health local e produção", "blue"),
    ]))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "Diagnóstico principal",
        "O CRM tem uma base funcional sólida: autenticação, banco, dashboard, leads, pipeline, metas, métricas, administração e deploy estão construídos e carregam. Entretanto, a operação comercial real ainda não começou: não existem corretores, leads, conversas, propostas ou metas no banco. OpenAI, Uazapi e Supabase Storage não estão configurados no ambiente local, então IA, WhatsApp e PDFs enviados não operam de ponta a ponta.",
        "blue",
    ))
    story.append(Spacer(1, 5 * mm))
    story.append(para("<b>O CRM pode ser usado agora</b> para cadastrar corretores e leads, organizar o pipeline, acompanhar registros e configurar a operação. <b>Ele ainda não pode ser considerado completo para atendimento automático</b>, porque os três conectores que sustentam WhatsApp, IA e arquivos estão desligados."))
    story.append(para("A produção Vercel está acessível e o health check retorna banco conectado. As alterações atuais de gestão de usuários e sessão permanecente estão locais e sem commit; portanto, não há garantia de que essa versão exata esteja publicada."))
    story.append(Spacer(1, 4 * mm))
    story.append(simple_table(
        ["Prioridade", "Ação", "Efeito"],
        [
            ["1", "Configurar Supabase Storage no runtime", "Libera logo, PDFs e arquivos privados."],
            ["2", "Conectar Uazapi e validar webhook", "Libera inbox real, envio manual e proposta por WhatsApp."],
            ["3", "Adicionar OpenAI", "Libera respostas, score, sentimento, transcrição e automações com IA."],
            ["4", "Corrigir busca, notificações, configurações comuns e menu móvel", "Remove elementos visuais sem ação."],
            ["5", "Atualizar o E2E e ampliar testes", "Evita regressões em login e rotas críticas."],
        ],
        [17 * mm, 70 * mm, 80 * mm],
    ))
    story.append(PageBreak())

    story += section_title("02", "Escopo e método", "Como o estado foi verificado sem alterar dados comerciais ou expor segredos.")
    story.append(para("A análise combinou evidências de quatro camadas:"))
    story.append(simple_table(
        ["Camada", "Verificação realizada", "Resultado"],
        [
            ["Código", "Inventário de páginas, APIs, componentes, serviços, schema Prisma e configuração Vercel.", "174 arquivos TypeScript/TSX, 22 páginas, 57 arquivos de rotas API."],
            ["Execução local", "Login administrativo real, navegação visual, health check, lint, testes unitários, E2E e build.", "Telas carregam; lint/build/unitários aprovados; E2E desatualizado falha."],
            ["Supabase", "Projeto, tabelas, contagens, migrações, buckets, permissões e advisors por consultas somente leitura.", "Projeto saudável, dados iniciais presentes, operação comercial vazia."],
            ["Produção", "Acesso HTTPS ao login e /api/health da URL principal.", "HTTP 200 e database: connected."],
        ],
        [31 * mm, 83 * mm, 53 * mm],
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "Critério de estado",
        "FUNCIONA significa que o recurso foi carregado ou exercitado com sucesso. PARCIAL significa que a interface e o código existem, mas faltam dados, credenciais ou uma validação completa. NÃO FUNCIONA significa que a ação está sem implementação ou bloqueada por configuração ausente.",
        "gold",
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(para("<b>Limites da auditoria:</b> nenhuma mensagem foi enviada, nenhum lead foi criado, nenhuma automação foi disparada, nenhum usuário foi desativado e nenhum arquivo foi enviado. As credenciais foram usadas apenas para validar o login local. Valores de variáveis de ambiente, hashes e strings de conexão não aparecem neste documento."))
    story.append(Spacer(1, 6 * mm))
    story.append(para("<b>Momento da coleta:</b> 12/08/2026. Contagens podem mudar após novos logins ou cadastros."))
    story.append(PageBreak())

    story += section_title("03", "Arquitetura atual", "O backend legado não participa da aplicação em produção.")
    story.append(architecture_drawing())
    story.append(Spacer(1, 5 * mm))
    story.append(simple_table(
        ["Camada", "Tecnologia", "Condição atual"],
        [
            ["Interface", "Next.js 16, React 19, TypeScript, Tailwind, SWR", "Funcional em frontend/."],
            ["APIs", "Route Handlers no mesmo serviço Next.js", "57 arquivos de rotas construídos."],
            ["Autenticação", "NextAuth 5 beta, Credentials, JWT, bcrypt", "Funcional com usuário do schema crm."],
            ["Banco", "Prisma 6 + PostgreSQL 17 no Supabase", "Conectado e saudável."],
            ["Arquivos", "Supabase Storage", "Buckets existem, cliente não configurado localmente."],
            ["IA", "OpenAI Responses e Transcriptions", "Código pronto, chave ausente."],
            ["WhatsApp", "Uazapi v2", "Código e webhook prontos, token/segredo ausentes."],
            ["Rate limit", "Upstash Redis com fallback em memória", "Fallback local ativo; Upstash ausente."],
            ["Deploy", "Vercel Services, um serviço frontend", "Produção online e cron declarado."],
            ["Legado", "backend/ Fastify", "Fora do build e do deploy."],
        ],
        [34 * mm, 68 * mm, 65 * mm],
    ))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Configuração Vercel", "O vercel.json da raiz publica somente frontend/ e agenda /api/cron/daily às 12:00 UTC. O projeto exige Node.js 22.", "green"))
    story.append(PageBreak())

    story += section_title("04", "Login, sessões e controle de acesso")
    auth_rows = [
        ("Login por e-mail e senha", "FUNCIONA", "Login administrativo local concluído e redirecionado para /dashboard.", "Não há recuperação de senha pelo próprio usuário."),
        ("Mostrar/ocultar senha", "FUNCIONA", "Botão visível e campo acessível na página de login.", "Nenhum bloqueio identificado."),
        ("Permanecer conectado", "FUNCIONA", "Cookie persistente por 30 dias quando marcado; sessão comum fica restrita à janela. Testes aprovados.", "Não há tela para listar ou revogar dispositivos individualmente."),
        ("Sessão comum", "FUNCIONA", "JWT com duração base de 8 horas; logout limpa preferência.", "Sem MFA."),
        ("Validação no banco", "FUNCIONA", "Conta ativa, CRM habilitado, role e sessionVersion são conferidos.", "Cache de 15 s pode manter uma decisão por poucos segundos."),
        ("Invalidação após reset", "FUNCIONA", "Redefinição incrementa sessionVersion e invalida sessões antigas.", "Validação E2E específica ainda não existe."),
        ("Acesso de administrador", "FUNCIONA", "Menu e APIs administrativas exigem role ADMIN.", "Há apenas um administrador; exige cuidado operacional."),
        ("Bloqueio individual", "FUNCIONA", "active e crmEnabled bloqueiam login/API por usuário.", "Não foi desativado durante a auditoria para preservar acesso."),
        ("Manutenção global", "FUNCIONA", "Corretores podem ser bloqueados; o ADMIN permanece autorizado.", "updatePolicy é armazenada, mas publicação de código continua sendo processo da Vercel."),
    ]
    story.append(matrix(auth_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Estado atual", "O CRM global está habilitado e a política registrada é ON_COMPLETION. Existe 1 usuário, que é administrador, ativo e com CRM habilitado.", "green"))
    story.append(PageBreak())

    story += section_title("05", "Experiência visual e navegação")
    ui_rows = [
        ("Identidade JD", "FUNCIONA", "Logo, favicon e apple-touch-icon existem em public/.", "Upload de nova logo pelo admin depende do Storage."),
        ("Modo escuro", "FUNCIONA", "Alternância está presente no login, CRM e painel admin.", "Nenhum problema visual crítico observado."),
        ("Navegação desktop", "FUNCIONA", "Sidebar principal e sidebar administrativa carregam e destacam a rota.", "Primeira compilação no modo dev é lenta."),
        ("Indicador de carregamento", "FUNCIONA", "Links principais exibem spinner enquanto a rota muda.", "Não reduz o custo da primeira compilação."),
        ("Busca global", "NÃO FUNCIONA", "Campo existe no cabeçalho.", "Não há estado, handler ou consulta ligada ao campo."),
        ("Notificações", "NÃO FUNCIONA", "Sino e ponto vermelho existem.", "Não há API, contador ou painel de notificações ligado ao botão."),
        ("Menu móvel", "NÃO FUNCIONA", "Botão de menu aparece em telas pequenas.", "O botão não possui ação e a sidebar fica oculta no mobile."),
        ("Configurações comuns", "NÃO FUNCIONA", "Página /settings mostra nome do sistema e botão salvar.", "O botão não persiste nada; use /admin/settings para ajustes reais."),
        ("Estados vazios", "FUNCIONA", "Dashboard, leads, metas e propostas exibem mensagens coerentes quando não há dados.", "São estados reais do banco, não dados fictícios."),
    ]
    story.append(matrix(ui_rows))
    story.append(PageBreak())

    story += section_title("06", "Dashboard, leads e pipeline")
    commercial_rows = [
        ("Dashboard comercial", "FUNCIONA", "Carrega leads ativos, conversas, propostas, receita, meta e prioridades.", "Todos os indicadores estão em zero por ausência de dados comerciais."),
        ("Cadastro de leads", "FUNCIONA", "APIs de criar, listar, editar e excluir existem com validação Zod e autorização.", "Não foi criado lead de teste para não alterar dados reais."),
        ("Pipeline", "FUNCIONA", "Lista, score, estágio, temperatura, paginação e ações em lote estão implementados.", "Sem leads para validar movimentação com dados reais."),
        ("Perfil 360 do lead", "FUNCIONA", "Visão geral, conversas, propostas, tarefas e atividades estão disponíveis.", "Sem lead atual para validar todas as abas em um caso real."),
        ("Tarefas", "FUNCIONA", "Criação vinculada ao lead e tipos follow-up, ligação, proposta e reativação.", "Não há painel global de tarefas dedicado."),
        ("Score manual", "PARCIAL", "Endpoint para recalcular score existe.", "A análise profunda depende da OpenAI, ausente."),
        ("Importação em massa", "FUNCIONA", "Admin pode preencher até 50 contatos, validar e enviar em lote.", "Importação real não executada durante a auditoria."),
        ("Carteira", "PARCIAL", "Alertas de aniversário, vencimento e risco de churn têm telas e APIs.", "Sem leads/clientes para produzir alertas."),
    ]
    story.append(matrix(commercial_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(simple_table(
        ["Dado operacional", "Quantidade atual"],
        [["Leads", 0], ["Atividades", 0], ["Tarefas", 0], ["Conversas", 0], ["Mensagens", 0], ["Propostas", 0], ["Metas", 0]],
        [83 * mm, 84 * mm],
    ))
    story.append(PageBreak())

    story += section_title("07", "WhatsApp, inbox e Uazapi")
    whatsapp_rows = [
        ("Inbox em duas colunas", "FUNCIONA", "Lista de conversas e janela de chat carregam; polling ocorre a cada 10 s.", "Exibe vazio porque não há conversas."),
        ("Webhook Uazapi", "PARCIAL", "Valida segredo, limita requisições, ignora grupos/própria instância e deduplica eventos.", "UAZAPI_WEBHOOK_SECRET não está configurado localmente."),
        ("Entrada de mensagem", "PARCIAL", "Upsert de lead, conversa e mensagem está implementado.", "Não validado com evento real da Uazapi."),
        ("Envio manual", "NÃO FUNCIONA", "Rota de resposta e serviço de envio existem.", "UAZAPI_BASE_URL e UAZAPI_TOKEN estão ausentes."),
        ("BOT/HUMANO/ENCERRADO", "PARCIAL", "Estados de conversa e alteração via API existem.", "Atendimento real depende da conexão Uazapi."),
        ("Status entregue/lido", "PARCIAL", "Webhook atualiza deliveredAt e readAt.", "Sem eventos reais para confirmação ponta a ponta."),
        ("Áudios", "NÃO FUNCIONA", "Tipos, URL de mídia e transcrição estão modelados.", "Precisa Uazapi, OpenAI e Storage para o fluxo completo."),
    ]
    story.append(matrix(whatsapp_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Resultado do endpoint de integrações", "Uazapi: error - UAZAPI_TOKEN não configurado. Última mensagem: nenhuma.", "red"))
    story.append(PageBreak())

    story += section_title("08", "Inteligência artificial")
    ai_rows = [
        ("Resposta rápida", "NÃO FUNCIONA", "Serviço usa modelo configurável e registra custo/latência.", "OPENAI_API_KEY ausente."),
        ("Análise profunda", "NÃO FUNCIONA", "Score e raciocínio usam modelo profundo com fallback.", "OPENAI_API_KEY ausente."),
        ("Sentimento e intenção", "NÃO FUNCIONA", "Modelo econômico e atualização da conversa estão implementados.", "Chave ausente; automação de sentimento está desativada."),
        ("Sugestão ao corretor", "NÃO FUNCIONA", "Botão gera sugestão editável e nunca envia sem confirmação.", "Sem chave e sem conversas."),
        ("Pré-atendimento automático", "NÃO FUNCIONA", "Webhook diferencia primeira mensagem e histórico.", "Precisa OpenAI + Uazapi."),
        ("Transcrição", "NÃO FUNCIONA", "Audio Transcriptions com idioma pt está implementado.", "Precisa OpenAI e mídia recebida."),
        ("Logs e custos", "PARCIAL", "AiLog guarda tokens, custo estimado, latência e sucesso.", "Não há chamadas registradas."),
        ("Análise de corretores", "PARCIAL", "Existe cálculo determinístico de batendo meta, dificuldade e ritmo em /api/admin/accounts.", "Não usa IA generativa, não aparece na tela atual de Corretores e não há corretores/metas."),
        ("Anthropic/Claude", "NÃO FUNCIONA", "Nenhuma dependência ou referência foi encontrada no frontend atual.", "Integração foi removida do escopo atual."),
    ]
    story.append(matrix(ai_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Estado OpenAI", "Endpoint administrativo: error - Chave não configurada. Custo estimado no mês: US$ 0. Nenhum AiLog.", "red"))
    story.append(PageBreak())

    story += section_title("09", "Propostas, PDF e arquivos")
    proposal_rows = [
        ("Cadastro de proposta", "FUNCIONA", "Formulário, listagem, valores, operadora, plano, cobertura, vidas e status estão modelados.", "Não há leads para criar proposta real."),
        ("Documento PDF", "PARCIAL", "React PDF gera o documento e a API retorna application/pdf.", "A geração exige upload no Storage antes de concluir."),
        ("Armazenamento privado", "NÃO FUNCIONA", "Bucket proposals existe com limite de 20 MB.", "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão configuradas localmente."),
        ("Link assinado", "PARCIAL", "Código cria URL de 30 dias para arquivo privado.", "Não pode executar sem credenciais do Storage."),
        ("Envio por WhatsApp", "NÃO FUNCIONA", "Gera PDF, envia documento, atualiza status e estágio do lead.", "Bloqueado simultaneamente por Storage e Uazapi."),
        ("Upload de logo", "NÃO FUNCIONA", "Bucket assets público existe com limite de 5 MB.", "Cliente do Storage não está configurado."),
        ("Bucket de áudios", "PARCIAL", "Bucket privado audios existe com limite de 20 MB.", "Sem objetos e sem fluxo conectado."),
    ]
    story.append(matrix(proposal_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(simple_table(
        ["Bucket", "Acesso", "Limite", "Objetos"],
        [["assets", "público", "5 MB", 0], ["audios", "privado", "20 MB", 0], ["proposals", "privado", "20 MB", 0]],
        [45 * mm, 42 * mm, 40 * mm, 40 * mm],
    ))
    story.append(PageBreak())

    story += section_title("10", "Metas, métricas e automações")
    analytics_rows = [
        ("Meta mensal", "FUNCIONA", "Criação, leitura, histórico e unicidade por usuário/mês/ano.", "Nenhuma meta cadastrada."),
        ("Dias úteis e projeção", "FUNCIONA", "Ritmo, necessário por dia, projeção e semáforo possuem testes unitários.", "Sem meta para exibir cálculo real."),
        ("Métricas", "FUNCIONA", "Overview, funil e receita possuem APIs e gráficos.", "Todos os números estão em zero por falta de negócios."),
        ("Equipe e ranking", "PARCIAL", "Admin exibe leads, fechamentos, receita, meta, conversão e resposta.", "Não há corretores nem resultados para comparar."),
        ("Regras de automação", "FUNCIONA", "6 regras existem, 5 ativas; admin pode pausar e editar.", "Nenhuma execução registrada."),
        ("Follow-up", "PARCIAL", "Job, cron e logs estão implementados.", "Precisa leads/propostas, OpenAI, Uazapi e CRON_SECRET."),
        ("Reativação", "PARCIAL", "Job e limite diário estão implementados.", "Precisa dados e integrações."),
        ("Score periódico", "PARCIAL", "Job de score está implementado.", "Precisa leads e OpenAI."),
        ("Cron Vercel", "PARCIAL", "vercel.json agenda a rotina diária às 12:00 UTC.", "CRON_SECRET está ausente localmente e a execução de produção não foi disparada."),
    ]
    story.append(matrix(analytics_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(simple_table(
        ["Automação", "Ativa", "Execuções/envios"],
        [
            ["Pré-atendimento IA", "sim", 0], ["Follow-up após proposta", "sim", 0],
            ["Resumo de conversa", "sim", 0], ["Reativação de base", "sim", 0],
            ["Análise de sentimento", "não", 0], ["Score automático", "sim", 0],
        ],
        [83 * mm, 40 * mm, 44 * mm],
    ))
    story.append(PageBreak())

    story += section_title("11", "Painel administrativo")
    admin_rows = [
        ("Visão executiva", "FUNCIONA", "MRR, vidas, leads do mês, fechamento, meta, equipe e ranking usam dados reais.", "Sem negócios, mostra zero e estados vazios."),
        ("Lista de corretores", "FUNCIONA", "Busca, filtros, role, status e último acesso carregam.", "Existe apenas o administrador; 0 corretores."),
        ("Criar/editar usuário", "FUNCIONA", "Nome, e-mail, telefone, role, status e acesso ao CRM são tratados.", "Fluxo de criação não foi concluído para evitar registro de teste."),
        ("Redefinir senha", "FUNCIONA", "Validação de força, hash bcrypt e invalidação de sessões antigas.", "Sem entrega automática por e-mail."),
        ("Ativar/desativar", "FUNCIONA", "Conta e CRM podem ser desligados separadamente.", "Autoproteção impede remover o último admin."),
        ("Excluir usuário", "FUNCIONA", "API protege autoexclusão e último admin.", "Se houver carteira, exige transferência."),
        ("Transferir carteira", "FUNCIONA", "Transação move leads para corretor ativo e registra ação.", "Sem corretores de destino no estado atual."),
        ("Perfil detalhado", "FUNCIONA", "Métricas, meta, último acesso, histórico e avatar estão implementados.", "Avatar depende do Storage."),
        ("Histórico de acesso", "FUNCIONA", "11 registros atuais e rota paginada.", "Retenção e política LGPD ainda não estão documentadas."),
        ("Saúde da carteira", "PARCIAL", "Aniversários, contratos vencendo e churn têm APIs e ações assistidas.", "Sem clientes e IA não configurada."),
        ("Importar dados", "FUNCIONA", "Planilha visual de até 50 linhas, validação e erros por linha.", "Não foi executada com contatos reais."),
    ]
    story.append(matrix(admin_rows))
    story.append(PageBreak())

    story += section_title("12", "Configurações, logs e governança")
    governance_rows = [
        ("Identidade da empresa", "FUNCIONA", "Admin persiste nome, CNPJ, SUSEP, contato, endereço e site.", "Campos empresariais estão majoritariamente vazios."),
        ("Persona da IA", "FUNCIONA", "Nome, tom, horário, boas-vindas e fora do horário são persistidos.", "Não produz efeito sem OpenAI/Uazapi."),
        ("Operadoras", "FUNCIONA", "6 operadoras ativas; criar e editar disponíveis.", "Logos dependem do Storage se forem usados."),
        ("Biblioteca de objeções", "FUNCIONA", "5 respostas ativas e editáveis.", "Uso automático depende da IA."),
        ("Liga/desliga global", "FUNCIONA", "crmEnabled bloqueia corretores e preserva admin.", "Não substitui um deploy controlado."),
        ("Política de atualização", "PARCIAL", "AUTOMATIC/ON_COMPLETION é armazenado no banco.", "Não existe integração com Vercel para segurar ou liberar deploy."),
        ("Logs de IA", "FUNCIONA", "Tela e API de custo/tokens/latência.", "0 registros."),
        ("Logs de cron", "FUNCIONA", "Tela e API de jobs/processados/erros.", "0 registros."),
        ("Logs de erro", "FUNCIONA", "Tela, API e marcação como resolvido.", "Há 1 erro não resolvido: Storage não configurado."),
        ("Estado das integrações", "FUNCIONA", "Endpoint não expõe segredos e testa serviços com timeout.", "Indica erro nos três conectores locais porque Storage é avaliado junto do Supabase."),
    ]
    story.append(matrix(governance_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Importante", "O banco Supabase está conectado. O cartão Supabase aparece como erro apenas porque a checagem administrativa inclui o Storage, cuja service role não foi configurada.", "gold"))
    story.append(PageBreak())

    story += section_title("13", "Supabase e banco de dados")
    story.append(kpi_cards([
        ("HEALTHY", "estado do projeto", "green"),
        ("18", "tabelas no schema crm", "blue"),
        ("4/4", "migrations Prisma aplicadas", "gold"),
        ("3", "buckets configurados", "blue"),
    ]))
    story.append(Spacer(1, 6 * mm))
    db_rows = [
        ["Projeto", "CRM JD Consultoria"],
        ["Organização", "Pessoal"],
        ["Project ref", "pjrhjkwkrmuvyuvrwnev"],
        ["URL pública", "https://pjrhjkwkrmuvyuvrwnev.supabase.co"],
        ["Região", "ca-central-1"],
        ["PostgreSQL", "17.6.1.155"],
        ["Schema operacional", "crm (privado)"],
        ["Acesso da aplicação", "Prisma por role técnica"],
    ]
    story.append(simple_table(["Propriedade", "Valor"], db_rows, [55 * mm, 112 * mm]))
    story.append(Spacer(1, 6 * mm))
    story.append(simple_table(
        ["Entidade", "Registros", "Entidade", "Registros"],
        [
            ["User", 1, "AccessLog", 11], ["Lead", 0, "Activity", 0],
            ["Conversation", 0, "Message", 0], ["Proposal", 0, "Goal", 0],
            ["Task", 0, "AutomationRule", 6], ["Operator", 6, "ObjectionLibrary", 5],
            ["AiLog", 0, "CronLog", 0], ["ErrorLog", 1, "SystemSettings", 1],
            ["CompanySettings", 1, "Storage objects", 0],
        ],
        [42 * mm, 31 * mm, 55 * mm, 39 * mm],
    ))
    story.append(Spacer(1, 5 * mm))
    story.append(callout("Migrações", "initial_crm, add_missing_foreign_key_indexes, admin_panel_data e add_user_access_logs estão concluídas no banco remoto.", "green"))
    story.append(PageBreak())

    story += section_title("14", "Segurança e privacidade")
    security_rows = [
        ("Segredos", "FUNCIONA", "Chaves ficam em variáveis de servidor e valores não são devolvidos pelas APIs.", "ADMIN_INITIAL_PASSWORD deve ser removida de produção após o seed."),
        ("Senhas", "FUNCIONA", "bcrypt com custo 12 e hash no banco.", "Sem política de expiração ou MFA."),
        ("Autorização", "FUNCIONA", "Guardas por usuário e admin consultam o banco e verificam sessionVersion.", "Cobertura E2E insuficiente."),
        ("Webhook", "PARCIAL", "Segredo, rate limit, validação Zod e deduplicação existem.", "Segredo não configurado; Upstash ausente."),
        ("Schema privado", "FUNCIONA", "crm não concede USAGE nem privilégios a anon/authenticated e não está exposto pela Data API; a aplicação usa Prisma.", "RLS está desabilitado; recomendável defesa em profundidade antes de qualquer exposição futura."),
        ("Storage", "PARCIAL", "Buckets privados e públicos estão separados.", "Service role ausente e políticas não foram exercitadas."),
        ("Logs", "PARCIAL", "Erros, acesso, IA e cron têm tabelas dedicadas.", "Falta política formal de retenção e anonimização."),
        ("LGPD", "PARCIAL", "Modelo suporta CPF, telefone, mensagens, áudio e documentos.", "Não há fluxo formal de consentimento, exportação, anonimização ou exclusão por titular."),
        ("Backups", "PARCIAL", "Banco gerenciado no Supabase.", "Política de backup/restore não foi comprovada nesta auditoria."),
    ]
    story.append(matrix(security_rows))
    story.append(Spacer(1, 5 * mm))
    story.append(callout(
        "Leitura correta sobre RLS",
        "As 18 tabelas estão sem RLS, mas a verificação direta mostrou que anon e authenticated não têm USAGE no schema crm, não possuem grants nas tabelas e não leem crm.User. Portanto, não foi confirmado vazamento atual. Ainda assim, habilitar RLS com políticas planejadas é uma melhoria de defesa em profundidade se o schema vier a ser exposto.",
        "gold",
    ))
    story.append(PageBreak())

    story += section_title("15", "Qualidade, testes e desempenho")
    story.append(simple_table(
        ["Verificação", "Resultado", "Detalhe"],
        [
            ["TypeScript / lint", "APROVADO", "tsc --noEmit, 0 erros, 35,1 s."],
            ["Testes unitários", "APROVADO", "8/8 aprovados, incluindo senha, metas, tempo de resposta e sessão persistente."],
            ["Build produção", "APROVADO", "Next.js compilou 60 páginas/rotas estáticas e todas as rotas dinâmicas em 71,1 s."],
            ["E2E login", "FALHOU", "Teste espera e-mail pré-preenchido, mas a tela segura agora abre vazia. A UI está correta; o teste ficou desatualizado."],
            ["Health local", "APROVADO", "Primeira chamada 4.878 ms; seguintes 250, 274, 271 e 319 ms."],
            ["Navegação interna aquecida", "APROVADO", "Pipeline 586 ms; Leads 803 ms; Inbox 548 ms; Métricas 409 ms."],
            ["Primeira rota no dev", "LENTA", "Compilações observadas entre 3,8 s e 11,3 s em rotas ainda frias."],
            ["Health produção", "APROVADO", "HTTP 200, database: connected; primeira medição 2.586 ms."],
            ["Página de login produção", "APROVADO", "HTTP 200; resposta HTML medida em 60 ms após aquecimento. A autenticação em produção não foi exercitada."],
        ],
        [42 * mm, 27 * mm, 98 * mm],
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "Resposta sobre o delay",
        "A demora alta é predominantemente local e ligada ao next dev compilando a rota na primeira visita. Depois de aquecidas, as trocas internas medidas ficaram entre 0,4 e 0,8 s. Há também latência de rede até o Supabase no Canadá. O build de produção está saudável, mas uma medição real com usuários e dados ainda é necessária.",
        "blue",
    ))
    story.append(Spacer(1, 5 * mm))
    story.append(para("<b>Dívida de testes:</b> há apenas 3 arquivos de teste unitário e 1 cenário E2E. Faltam testes de CRUD de leads, permissões, administração, webhook, proposta/PDF, cron e integrações."))
    story.append(PageBreak())

    story += section_title("16", "Local, Git e produção")
    story.append(simple_table(
        ["Ambiente", "Estado", "Observação"],
        [
            ["Workspace local", "Mais avançado", "Inclui gestão completa de usuários e Permanecer conectado."],
            ["Git branch", "codex/admin-user-management", "Há alterações modificadas e arquivos novos sem commit."],
            ["Commit base", "e5aedb5", "Base igual a main/origin/main no início da auditoria."],
            ["Produção Vercel", "Online", "Health e login respondem, mas a paridade com alterações locais não está comprovada."],
            ["Deploy", "Não realizado", "Esta auditoria não fez commit, push ou novo deployment."],
        ],
        [38 * mm, 39 * mm, 90 * mm],
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(callout(
        "Risco de versão",
        "O sistema que foi validado localmente contém trabalho ainda não versionado. Se a máquina perder essas alterações, parte da gestão de usuários e da sessão persistente pode ser perdida. O passo seguro é revisar o diff, corrigir o E2E, executar os testes novamente e só então fazer commit/push/deploy quando autorizado.",
        "red",
    ))
    story.append(Spacer(1, 6 * mm))
    story.append(para("<b>Variáveis locais configuradas:</b> conexão Prisma, conexão direta, segredo de sessão, URL local e dados administrativos iniciais. <b>Variáveis locais ausentes:</b> OpenAI, Uazapi, Supabase Storage, CRON_SECRET e Upstash REST. O relatório registra apenas presença/ausência; nenhum valor foi lido para o documento."))
    story.append(Spacer(1, 4 * mm))
    story.append(para("<b>Observação:</b> REDIS_URL está preenchida no arquivo local, mas o código de rate limit usa UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN. Portanto, o Redis configurado atualmente não ativa o limitador distribuído."))
    story.append(PageBreak())

    story += section_title("17", "Plano de fechamento", "Sequência recomendada para transformar a base funcional em operação completa.")
    roadmap = [
        ["P0", "Corrigir funções visuais sem ação", "Ligar busca, notificações, menu móvel e remover ou implementar /settings.", "Evita expectativas falsas e melhora uso diário."],
        ["P0", "Versionar com segurança", "Revisar alterações locais, corrigir E2E, rodar lint/test/build e criar commit.", "Protege o trabalho atual."],
        ["P0", "Configurar Storage", "Adicionar URL pública e service role somente no servidor; validar logo e PDF.", "Desbloqueia arquivos."],
        ["P0", "Conectar Uazapi", "Adicionar URL/token/instância/segredo e configurar webhook HTTPS.", "Desbloqueia WhatsApp."],
        ["P0", "Conectar OpenAI", "Adicionar chave/modelos e executar testes controlados de resposta, score e transcrição.", "Desbloqueia IA."],
        ["P1", "Configurar CRON_SECRET e Upstash", "Validar cron diário e rate limiting distribuído.", "Melhora automação e segurança."],
        ["P1", "Cadastrar equipe e metas", "Criar corretores reais, metas mensais e permissões.", "Torna dashboard e análise úteis."],
        ["P1", "Teste piloto", "Cadastrar poucos leads, validar pipeline, conversa, proposta e logs ponta a ponta.", "Confirma operação real antes de escalar."],
        ["P1", "Completar análise do admin", "Exibir na UI os insights de batendo meta/dificuldade e decidir se serão regras ou IA.", "Atende o requisito gerencial explícito."],
        ["P2", "Fortalecer LGPD e segurança", "Retenção, consentimento, exportação, anonimização, backups e revisão de RLS.", "Reduz risco operacional."],
        ["P2", "Observabilidade", "Monitorar produção, erros, latência, cron, custos e alertas.", "Facilita suporte e crescimento."],
    ]
    story.append(simple_table(["Nível", "Frente", "Ação", "Resultado"], roadmap, [15 * mm, 43 * mm, 70 * mm, 39 * mm], small=True))
    story.append(Spacer(1, 6 * mm))
    story.append(callout("Critério de pronto", "O CRM estará operacional de ponta a ponta quando um lead real entrar pelo WhatsApp, for atendido com segurança, percorrer o pipeline, receber proposta em PDF, gerar métricas/metas, aparecer no painel admin e deixar logs verificáveis sem erros de integração.", "green"))
    story.append(PageBreak())

    story += section_title("18", "Apêndice A - Mapa de telas")
    page_rows = [
        ["/login", "Login, senha visível e Permanecer conectado", "funciona"],
        ["/dashboard", "KPIs, meta e prioridades", "funciona, vazio"],
        ["/inbox", "Conversas e chat", "parcial, sem Uazapi"],
        ["/pipeline", "Leads, score e ações", "funciona, vazio"],
        ["/leads", "Lista e perfil 360", "funciona, vazio"],
        ["/leads/[id]", "Detalhe do lead", "implementado, sem caso real"],
        ["/proposals", "Propostas e PDF", "parcial"],
        ["/automations", "Regras comerciais", "funciona"],
        ["/goals", "Metas, histórico e equipe", "funciona, vazio"],
        ["/metrics", "Funil e receita", "funciona, zero"],
        ["/settings", "Nome do sistema", "não persiste"],
        ["/maintenance", "Mensagem de manutenção", "implementado"],
        ["/admin/dashboard", "Visão executiva", "funciona"],
        ["/admin/users", "Gestão de corretores", "funciona"],
        ["/admin/users/[id]", "Perfil e histórico", "funciona"],
        ["/admin/automations", "Controle das automações", "funciona"],
        ["/admin/carteira", "Risco, vencimentos, aniversários", "parcial sem dados"],
        ["/admin/settings", "Empresa, IA, catálogo e integrações", "funciona; conectores em erro"],
        ["/admin/logs", "IA, cron e erros", "funciona"],
        ["/admin/import", "Importação em grade", "funciona"],
    ]
    story.append(simple_table(["Rota", "Função", "Estado"], page_rows, [39 * mm, 84 * mm, 44 * mm], small=True))
    story.append(PageBreak())

    story += section_title("19", "Apêndice B - Mapa de APIs")
    api_rows = [
        ["Autenticação", "/api/auth/[...nextauth]", "login, sessão e logout"],
        ["Saúde", "/api/health", "conectividade do banco"],
        ["Leads", "/api/leads, /api/leads/[id]", "CRUD e detalhe"],
        ["Pipeline", "/api/pipeline, /leads, /bulk", "lista e ações em lote"],
        ["Score e tarefas", "/api/leads/[id]/score, /tasks", "IA e agenda"],
        ["Conversas", "/api/conversations, /[id], /reply", "chat, status e sugestão"],
        ["Mensagens", "/api/messages", "envio"],
        ["Webhook", "/api/webhook/uazapi", "entrada e atualizações Uazapi"],
        ["Propostas", "/api/proposals, /[id]/pdf, /send", "CRUD, PDF e WhatsApp"],
        ["Metas", "/api/goals, /current, /history, /projection, /team", "meta e ritmo"],
        ["Métricas", "/api/metrics/overview, /funnel, /revenue", "KPIs e gráficos"],
        ["Automações", "/api/automations", "listar, criar, excluir"],
        ["Cron", "/api/cron/daily, /follow-up, /reactivation, /score-update", "rotinas"],
        ["Admin usuários", "/api/admin/users e subrotas", "acesso, avatar, senha, transferência"],
        ["Admin operação", "/api/admin/overview, /team, /accounts", "KPIs e desempenho"],
        ["Admin carteira", "/api/admin/carteira/*", "alertas e ações"],
        ["Admin dados", "/api/admin/operators, /objections, /leads/bulk-create", "cadastros"],
        ["Admin settings", "/api/admin/settings, /logo, /integrations", "configuração e status"],
        ["Admin logs", "/api/admin/logs/ai, /cron, /errors", "auditoria"],
    ]
    story.append(simple_table(["Grupo", "Rotas principais", "Responsabilidade"], api_rows, [36 * mm, 83 * mm, 48 * mm], small=True))
    story.append(PageBreak())

    story += section_title("20", "Apêndice C - Evidências e conclusão")
    story.append(para("<b>Evidências técnicas usadas</b>"))
    evidence = [
        ["Repositório", "daniellopesneves17/CRM-JD-Consultoria"],
        ["Workspace", str(ROOT)],
        ["Produção", "https://crm-jd-consultoria.vercel.app"],
        ["Supabase", "https://pjrhjkwkrmuvyuvrwnev.supabase.co"],
        ["Comandos", "npm run lint; npm run test:unit; npm run test:e2e; npm run build"],
        ["Validação visual", "Login e 15 áreas principais no localhost com perfil ADMIN"],
        ["Consultas", "Contagens, migrações, permissões, buckets e advisors, todas somente leitura"],
    ]
    story.append(simple_table(["Fonte", "Referência"], evidence, [45 * mm, 122 * mm]))
    story.append(Spacer(1, 7 * mm))
    story.append(callout(
        "Conclusão final",
        "O CRM não é apenas uma maquete: a base transacional, a autenticação, o painel comercial e o painel administrativo funcionam. O que impede o uso completo hoje é a combinação de operação vazia e conectores ausentes. Além disso, quatro controles visuais ainda não têm ação real. Com Storage, Uazapi, OpenAI, cron/rate limit, correção desses controles e um piloto com dados reais, o sistema pode avançar para produção operacional controlada.",
        "blue",
    ))
    story.append(Spacer(1, 12 * mm))
    story.append(para("Relatório gerado em 12/08/2026 às " + datetime.now().strftime("%H:%M") + " (America/Sao_Paulo).", "SmallCRM"))
    story.append(para("Nenhum segredo, senha, token, hash ou string de conexão foi incluído.", "SmallCRM"))
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = CRMDocTemplate(
        str(OUTPUT), pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=24 * mm, bottomMargin=20 * mm,
        title="Relatório completo do CRM JD Consultoria",
        author="Codex",
        subject="Auditoria funcional e técnica do estado atual do CRM",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=page_background)])
    doc.build(build_story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
