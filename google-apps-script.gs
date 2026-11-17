/**
 * Google Apps Script — Receptor de Leads + Planilha + E-mail (Bottons & Cia)
 *
 * Como instalar / atualizar (100% gratuito, sem n8n/Make):
 * 1. Abra sua Planilha Google > Extensões > Apps Script.
 * 2. Apague o código antigo e cole todo este arquivo.
 * 3. Clique em: Implantar > Gerenciar implantações > Editar (ícone de lápis) > Nova versão > Implantar.
 *    (Se for a primeira vez: Implantar > Nova implantação > Tipo: App da Web > Executar como: Eu > Quem pode acessar: Qualquer pessoa.)
 * 4. Na primeira autorização, aceite a permissão de envio de e-mail (MailApp).
 * 5. Copie a URL gerada (termina em /exec) e cole na constante WEBHOOK_URL (linha 4) de projects/botons-e-cia/script.js.
 */

var EMAIL_DESTINO = "atendimento@botonsecia.com.br";
var NOME_ABA = "Página1";

var CABECALHO = [
  "Data/Hora",
  "Protocolo",
  "Canal",
  "Nome / Empresa",
  "WhatsApp / Telefone",
  "E-mail",
  "Quantidade",
  "Observações",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gad_source",
  "fbclid",
  "URL de Entrada",
  "Referrer"
];

// Impede que um texto enviado pelo formulário vire fórmula na planilha (=, +, -, @)
function seguro(valor) {
  var texto = String(valor == null ? "" : valor).slice(0, 2000);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = planilha.getSheetByName(NOME_ABA) || planilha.getSheets()[0];

    // Cria cabeçalho automático se a aba estiver vazia
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(CABECALHO);
      sheet.getRange(1, 1, 1, CABECALHO.length).setFontWeight("bold");
    }

    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.protocolo,
      data.canal,
      data.nome,
      data.telefone,
      data.email,
      data.quantidade,
      data.observacoes,
      data.utm_source,
      data.utm_medium,
      data.utm_campaign,
      data.utm_term,
      data.utm_content,
      data.gclid,
      data.gad_source,
      data.fbclid,
      data.landing_url,
      data.referrer
    ].map(seguro));

    lock.releaseLock();

    // Envia notificação por e-mail para todo cadastro no formulário
    if (data.canal === "formulario" || data.canal === "formulario_abaixo_minimo") {
      var prefixo = data.canal === "formulario_abaixo_minimo" ? "[Abaixo de 150 unid.] " : "";
      var assunto = prefixo + "Novo Lead LP Botton Americano — " + (data.nome || "Sem nome") + " (" + (data.protocolo || "") + ")";

      var corpo = [
        "Novo cadastro recebido na Landing Page de Botton Americano:",
        "",
        "Protocolo: " + (data.protocolo || "-"),
        "Nome / Empresa: " + (data.nome || "-"),
        "WhatsApp / Telefone: " + (data.telefone || "-"),
        "E-mail: " + (data.email || "-"),
        "Quantidade estimada: " + (data.quantidade || "-"),
        "Observações: " + (data.observacoes || "-"),
        "",
        "--- Rastreamento (UTMs / Google Ads / Meta) ---",
        "utm_source: " + (data.utm_source || "-"),
        "utm_medium: " + (data.utm_medium || "-"),
        "utm_campaign: " + (data.utm_campaign || "-"),
        "utm_term: " + (data.utm_term || "-"),
        "utm_content: " + (data.utm_content || "-"),
        "gclid: " + (data.gclid || "-"),
        "fbclid: " + (data.fbclid || "-"),
        "URL de entrada: " + (data.landing_url || "-")
      ].join("\n");

      var mailOptions = {
        to: EMAIL_DESTINO,
        subject: assunto,
        body: corpo
      };
      if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        mailOptions.replyTo = data.email;
      }

      MailApp.sendEmail(mailOptions);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try { lock.releaseLock(); } catch (ignore) {}
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
