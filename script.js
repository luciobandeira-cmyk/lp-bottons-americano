document.addEventListener("DOMContentLoaded", () => {
  const WHATSAPP_NUMBER = "551130190500";
  // Cole aqui a URL do seu Webhook (Google Apps Script, n8n, Make ou CRM) para registrar UTMs + gclid + protocolo:
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzNzehBOKcar2M8e2QqNPfl2YzJ3Q_EOTQmppdZrH46oJLCwCoI9SKGpTbWE5DftPfY/exec";

  /* Captura de UTMs / GCLID + Geração de Código de Protocolo */
  const TRACKING_KEY = "bc_tracking_v1";
  const PROTOCOL_PREFIX = "BAV4-";
  const TRACKED_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gad_source", "fbclid"];

  const generateProtocol = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = PROTOCOL_PREFIX;
    for (let i = 0; i < 5; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const getTrackingData = () => {
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(TRACKING_KEY) || "{}");
    } catch {
      saved = {};
    }

    const params = new URLSearchParams(window.location.search);
    let hasNewParam = false;
    TRACKED_PARAMS.forEach((key) => {
      const val = params.get(key);
      if (val) {
        saved[key] = val;
        hasNewParam = true;
      }
    });

    if (!saved.protocolo || !String(saved.protocolo).startsWith(PROTOCOL_PREFIX)) {
      saved.protocolo = generateProtocol();
    }
    if (hasNewParam || !saved.landing_url) {
      saved.landing_url = window.location.href;
      saved.referrer = document.referrer || "";
    }

    try {
      sessionStorage.setItem(TRACKING_KEY, JSON.stringify(saved));
    } catch {
      /* ignore storage restrictions */
    }
    return saved;
  };

  const trackingData = getTrackingData();

  const sendTrackingWebhook = (payload) => {
    if (!WEBHOOK_URL) return;
    const body = JSON.stringify({
      ...trackingData,
      ...payload,
      timestamp: new Date().toISOString()
    });
    // text/plain evita preflight CORS no Google Apps Script
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      navigator.sendBeacon(WEBHOOK_URL, blob);
    } else {
      fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        keepalive: true
      }).catch(() => {});
    }
  };

  /* Atualiza links diretos de WhatsApp com o Código de Protocolo + dispara webhook ao clicar */
  document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
    try {
      const url = new URL(link.href);
      const currentText = url.searchParams.get("text") || "Olá! Quero um orçamento de botton americano personalizado.";
      if (!currentText.includes("Protocolo:")) {
        url.searchParams.set("text", `${currentText}\n\nCódigo de Protocolo: ${trackingData.protocolo}`);
        link.href = url.toString();
      }
    } catch {
      /* ignore malformed href */
    }

    link.addEventListener("click", () => {
      sendTrackingWebhook({ canal: "whatsapp_direto" });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "whatsapp_click",
        protocolo: trackingData.protocolo,
        utm_source: trackingData.utm_source || "",
        utm_campaign: trackingData.utm_campaign || ""
      });
    });
  });

  /* Header: estado compacto ao rolar */
  const header = document.getElementById("site-header");
  if (header) {
    let ticking = false;
    const syncHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
      ticking = false;
    };
    syncHeader();
    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncHeader);
      }
    }, { passive: true });
  }

  /* Carrossel coverflow */
  const carousel = document.getElementById("portfolio-carousel");
  if (carousel) {
    const items = Array.from(carousel.querySelectorAll(".cf-item"));
    const dots = Array.from(document.querySelectorAll(".cf-dot"));
    const prevBtn = document.getElementById("prev-slide");
    const nextBtn = document.getElementById("next-slide");
    const caption = document.getElementById("cf-caption");
    const activeName = document.getElementById("cf-active-name");
    const activeMeta = document.getElementById("cf-active-meta");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const total = items.length;
    let current = 0;
    let timer = null;
    let userPaused = false;
    let inView = false;

    items.forEach((item, i) => {
      item.setAttribute("aria-label", `${i + 1} de ${total}: ${item.dataset.name || ""}`);
    });

    const getOffset = (index) => {
      let diff = index - current;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      return diff;
    };

    const render = () => {
      items.forEach((item, i) => {
        const pos = getOffset(i);
        if (Math.abs(pos) <= 2) {
          item.setAttribute("data-pos", String(pos));
        } else {
          item.removeAttribute("data-pos");
        }
        item.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
      });

      dots.forEach((dot, i) => {
        const active = i === current;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      const currentItem = items[current];
      if (currentItem) {
        if (activeName) activeName.textContent = currentItem.dataset.name || "";
        if (activeMeta) activeMeta.textContent = currentItem.dataset.meta || "";
      }
    };

    const goTo = (index) => {
      current = (index + total) % total;
      render();
    };

    const stopAuto = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const startAuto = () => {
      if (prefersReduced || userPaused || timer || !inView || document.hidden) return;
      timer = window.setInterval(() => goTo(current + 1), 4200);
    };

    /* Interação manual: para o autoplay de vez e passa a anunciar a legenda */
    const manualGoTo = (index) => {
      userPaused = true;
      stopAuto();
      if (caption) caption.setAttribute("aria-live", "polite");
      goTo(index);
    };

    items.forEach((item, idx) => {
      item.addEventListener("click", () => {
        if (idx !== current) manualGoTo(idx);
      });
    });

    dots.forEach((dot, idx) => dot.addEventListener("click", () => manualGoTo(idx)));
    prevBtn?.addEventListener("click", () => manualGoTo(current - 1));
    nextBtn?.addEventListener("click", () => manualGoTo(current + 1));

    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); manualGoTo(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); manualGoTo(current + 1); }
    });

    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", startAuto);
    carousel.addEventListener("focusin", stopAuto);
    carousel.addEventListener("focusout", (e) => {
      if (!carousel.contains(e.relatedTarget)) startAuto();
    });
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") manualGoTo(current - 1);
      if (e.key === "ArrowRight") manualGoTo(current + 1);
    });

    let touchStartX = 0;
    carousel.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) manualGoTo(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });

    /* Só roda quando visível: economiza CPU e não troca slide fora da tela */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        if (inView) startAuto(); else stopAuto();
      }, { threshold: 0.35 }).observe(carousel);
    } else {
      inView = true;
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto(); else startAuto();
    });

    render();
    startAuto();
  }

  /* FAQ: um item aberto por vez (fallback para navegadores sem <details name>) */
  const faqItems = Array.from(document.querySelectorAll(".faq-list details"));
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });

  /* Formulário de orçamento */
  const form = document.getElementById("quote-form");
  if (!form) return;
  const quoteFields = document.getElementById("quote-fields");
  const successBox = document.getElementById("form-success");
  const successProtocol = document.getElementById("form-success-protocol");
  const belowMinBox = document.getElementById("form-below-minimum");
  const resetQuoteBtn = document.getElementById("reset-quote-form");
  const errorSummary = document.getElementById("form-error-summary");
  const errorList = document.getElementById("form-error-list");

  /* Máscara de telefone BR: (11) 99999-9999 / (11) 3019-0500 */
  const phone = document.getElementById("telefone");
  phone?.addEventListener("input", () => {
    const d = phone.value.replace(/\D/g, "").slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) {
      const split = d.length === 11 ? 7 : 6;
      out = `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
    }
    phone.value = out;
  });

  const fields = [
    {
      id: "nome",
      errId: "err-nome",
      msg: "Informe seu nome ou o nome da empresa.",
      check: (val) => val.trim().length > 1
    },
    {
      id: "telefone",
      errId: "err-telefone",
      msg: "Informe um WhatsApp ou telefone com DDD.",
      check: (val) => val.replace(/\D/g, "").length >= 10
    },
    {
      id: "email",
      errId: "err-email",
      msg: "Informe um e-mail válido, como nome@empresa.com.br.",
      check: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
    },
    {
      id: "quantidade",
      errId: "err-quantidade",
      msg: "Selecione a faixa de quantidade.",
      check: (val) => val.trim().length > 0
    }
  ];

  const validateField = ({ id, errId, msg, check }) => {
    const input = document.getElementById(id);
    const err = document.getElementById(errId);
    const valid = Boolean(input && check(input.value));
    if (err) err.textContent = valid ? "" : msg;
    if (input) input.setAttribute("aria-invalid", valid ? "false" : "true");
    return valid;
  };

  /* Valida no blur; depois do primeiro erro, revalida enquanto a pessoa corrige */
  fields.forEach((field) => {
    const input = document.getElementById(field.id);
    if (!input) return;
    input.addEventListener("blur", () => {
      if (input.value.trim()) validateField(field);
    });
    const revalidate = () => {
      if (input.getAttribute("aria-invalid") === "true") validateField(field);
    };
    input.addEventListener("input", revalidate);
    input.addEventListener("change", revalidate);
  });

  const valueOf = (id) => (document.getElementById(id)?.value || "").trim();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const results = fields.map(validateField);
    const invalidFields = fields.filter((_, i) => !results[i]);
    if (invalidFields.length > 0) {
      if (errorSummary && errorList) {
        errorList.innerHTML = invalidFields
          .map((f) => `<li><a href="#${f.id}">${f.msg}</a></li>`)
          .join("");
        errorSummary.hidden = false;
        errorSummary.focus();
      } else {
        document.getElementById(invalidFields[0].id)?.focus();
      }
      return;
    }

    if (errorSummary) errorSummary.hidden = true;

    const quantidade = valueOf("quantidade");
    const isBelowMinimum = quantidade === "Menos de 150 peças";
    const notes = valueOf("observacoes");

    sendTrackingWebhook({
      canal: isBelowMinimum ? "formulario_abaixo_minimo" : "formulario",
      nome: valueOf("nome"),
      telefone: valueOf("telefone"),
      email: valueOf("email"),
      quantidade,
      observacoes: notes
    });

    if (isBelowMinimum) {
      if (quoteFields) quoteFields.hidden = true;
      if (successBox) successBox.hidden = true;
      if (belowMinBox) {
        belowMinBox.hidden = false;
        belowMinBox.focus({ preventScroll: true });
      }
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "generate_lead",
      form_id: "quote-form",
      quantidade,
      protocolo: trackingData.protocolo,
      utm_source: trackingData.utm_source || "",
      utm_campaign: trackingData.utm_campaign || ""
    });

    if (quoteFields) quoteFields.hidden = true;
    if (belowMinBox) belowMinBox.hidden = true;
    if (successProtocol) successProtocol.textContent = `Protocolo ${trackingData.protocolo}`;
    if (successBox) {
      successBox.hidden = false;
      successBox.focus({ preventScroll: true });
    }
  });

  resetQuoteBtn?.addEventListener("click", () => {
    if (belowMinBox) belowMinBox.hidden = true;
    if (quoteFields) quoteFields.hidden = false;
    document.getElementById("quantidade")?.focus();
  });
});
