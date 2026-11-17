/**
 * Google Apps Script — Receptor de Leads + UTMs + Protocolo (Bottons & Cia)
 *
 * Como instalar (100% gratuito, sem n8n/Make):
 * 1. Crie uma nova Planilha no Google Sheets.
 * 2. No menu superior, clique em: Extensões > Apps Script.
 * 3. Apague o código padrão e cole todo este arquivo.
 * 4. Clique em: Implantar > Nova implantação > Tipo: App da Web.
 *    - Executar como: Eu (sua conta)
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Autorize e copie a URL gerada (termina em /exec).
 * 6. Cole essa URL na constante WEBHOOK_URL (linha 4) de projects/botons-e-cia/script.js.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Cria cabeçalho automático na primeira execução
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
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
        "URL de Entrada"
      ]);
      sheet.getRange(1, 1, 1, 15).setFontWeight("bold");
    }

    var data = JSON.parse(e.postData.contents || "{}");

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.protocolo || "",
      data.canal || "",
      data.nome || "",
      data.telefone || "",
      data.email || "",
      data.quantidade || "",
      data.observacoes || "",
      data.utm_source || "",
      data.utm_medium || "",
      data.utm_campaign || "",
      data.utm_term || "",
      data.utm_content || "",
      data.gclid || "",
      data.landing_url || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
