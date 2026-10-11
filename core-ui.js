/* CORE · Bitácora de Paradas de Planta — pantallas nuevas:
   1) Chequeo "informe listo para entregar"   2) Cierre de turno + alertas
   3) Importar chat de WhatsApp                4) Redactar con IA (copiar y pegar, sin costo)
   Todo corre en el equipo, sin internet y sin enviar datos a ningún servicio. Los números salen de core-calculo.js. */
(function () {
  'use strict';
  const C = window.CoreCalculo;
  const $ = (id) => document.getElementById(id);
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = {
    check: '<path d="m5 12 4 4L19 6"/>', warn: '<path d="M12 3 2 20h20zM12 10v5M12 18v.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>', save: '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20h4"/>', upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  };
  const ic = (n, cls) => `<svg class="ui-icon ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.info}</svg>`;
  const toast = (m) => { try { showToast(m); } catch (e) { alert(m); } };

  // ------------------------------------------------------------------ configuración (reglas)
  const cfgKey = () => 'core.cfg.' + (typeof PARADA_ID !== 'undefined' ? PARADA_ID : 'x');
  function cargarCfg() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(cfgKey()) || '{}'); } catch (e) { /* sin config guardada */ }
    return Object.assign({ umbralAtraso: 10, umbralCritico: 25, turnosSinAvance: 2, avisoActivo: true, corteA: '08:00', corteB: '20:00' }, c);
  }
  function guardarCfg(c) { try { localStorage.setItem(cfgKey(), JSON.stringify(c)); } catch (e) { toast('No se pudo guardar la configuración'); } }

  // ------------------------------------------------------------------ puente con los datos de la app
  function buildCtx() {
    const curve = computeCurve();
    const N = SEED_DATA.turnos.length;
    const todos = new Set(Array.from({ length: N }, (_, i) => i));
    return {
      turnos: SEED_DATA.turnos, turnoLabels: SEED_DATA.turnoLabels, ots: allOts(),
      progressAt: (ot, i) => otProgressAt(ot, i),
      estado: (n) => getOtEstado(n), motivo: (n) => getOtMotivo(n),
      reportes: (ot) => {
        if (esCampaniaPolines(ot)) return todos;                       // campañas de polines: el avance no es por turno
        const s = new Set();
        const marcar = (av) => Object.keys(av || {}).forEach((k) => s.add(parseInt(k, 10)));
        marcar(state.liveOtAvance[ot.otNum]);
        (ot.subactividades || []).forEach((sub) => marcar(getSubLive(ot.otNum, sub.nombre).avance));
        return s;
      },
      bitacora: state.bitacora || [],
      planGlobal: (i) => curve.percentPlan[i] || 0,
      realGlobal: (i) => (curve.percentReal[i] == null ? null : curve.percentReal[i]),
    };
  }
  const bitacoraDe = (i) => (state.bitacora || []).filter((b) => b.turnoIdx === i);
  const paradaNombre = () => (SEED_DATA.paradaNombre || '').replace(/ — FCR&M$/, '');

  // ------------------------------------------------------------------ estado de la pantalla
  const S = { tab: 'cierre', turno: null, soloAlertas: false, cierres: [], wa: null, ia: { respuesta: '' } };
  const lvl = { critica: ['Crítica', 'crit'], atraso: ['Atraso', 'warn'], aviso: ['Aviso', 'aviso'], info: ['Info', 'info'] };
  const nivelFila = { completada: ['Completada', 'ok'], critica: ['Crítica', 'crit'], atrasada: ['Atrasada', 'warn'], ok: ['En plazo', 'ok2'], adelantada: ['Adelantada', 'ok'], 'por-iniciar': ['Por iniciar', 'muted'], pausada: ['En pausa', 'muted'] };
  const pc = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
  const ppf = (v) => (v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' pp');

  function turnoPorDefecto() {
    const last = lastReportedTurno();
    return last >= 0 ? last : C.turnoSugerido(SEED_DATA.turnos, Date.now());
  }
  function evaluar(i) { return C.evaluarTurno(buildCtx(), i, cargarCfg()); }

  // ------------------------------------------------------------------ vista principal
  function construirVista() {
    if ($('view-control')) return;
    const v = document.createElement('section');
    v.className = 'view'; v.id = 'view-control';
    v.innerHTML = `<section class="ui-page-intro"><div><p class="ui-overline">CONTROL DE TURNO</p><h1>Cierre de turno<span>.</span></h1><p>Compara el plan con lo registrado, detecta atrasos y prepara el resumen del turno. Todo se calcula en este equipo.</p></div></section>
      <div class="core-tabs" role="tablist" aria-label="Secciones de control de turno">
        <button type="button" role="tab" data-core-tab="cierre">${ic('target')}Cierre y alertas</button>
        <button type="button" role="tab" data-core-tab="whatsapp">${ic('chat')}Importar WhatsApp</button>
        <button type="button" role="tab" data-core-tab="ia">${ic('spark')}Redactar con IA</button>
      </div>
      <div id="coreContenido"></div>`;
    document.querySelector('main').appendChild(v);
    v.addEventListener('click', onClickVista);
    v.addEventListener('change', onChangeVista);
  }

  function render() {
    construirVista();
    if (S.turno == null) S.turno = turnoPorDefecto();
    document.querySelectorAll('[data-core-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.coreTab === S.tab)));
    const cont = $('coreContenido');
    try {
      if (S.tab === 'cierre') cont.innerHTML = htmlCierre();
      else if (S.tab === 'whatsapp') cont.innerHTML = htmlWhatsApp();
      else cont.innerHTML = htmlIA();
    } catch (e) { console.error(e); cont.innerHTML = `<div class="ui-panel core-pad"><h2>No se pudo calcular</h2><p>${h(e.message)}</p></div>`; }
    if (S.tab === 'whatsapp') pintarFotosWhatsApp();
  }

  const selectorTurno = () => `<label class="ui-filter core-turno"><span>Turno</span><select id="coreTurno">${SEED_DATA.turnoLabels.map((l, i) => `<option value="${i}" ${i === S.turno ? 'selected' : ''}>${h(l)}</option>`).join('')}</select></label>`;

  // ---- 1) Cierre de turno + alertas
  function htmlCierre() {
    const cfg = cargarCfg(), res = evaluar(S.turno);
    const alertas = res.alertas;
    const guardado = S.cierres.find((c) => c.id === 'turno-' + S.turno);
    const desvClase = res.desvGlobal == null ? '' : res.desvGlobal <= -cfg.umbralCritico ? 'crit' : res.desvGlobal <= -cfg.umbralAtraso ? 'warn' : 'ok';
    const filas = res.filas.filter((f) => !S.soloAlertas || ['critica', 'atrasada'].includes(f.nivel) || f.sinReporte);
    return `
    <div class="core-bar">${selectorTurno()}
      <div class="core-bar-actions">
        <button class="ui-button" data-core="copiar-resumen">${ic('copy')}Copiar resumen</button>
        <button class="ui-button" data-core="ir-ia">${ic('spark')}Preparar para IA</button>
        <button class="ui-button primary" data-core="guardar-cierre">${ic('save')}${guardado ? 'Actualizar cierre guardado' : 'Guardar cierre'}</button>
      </div></div>
    <section class="ui-stats core-stats">
      <div class="ui-stat"><div class="ui-stat-top">Plan general</div><strong>${pc(res.planGlobal)}</strong><span>según el cronograma oficial</span></div>
      <div class="ui-stat"><div class="ui-stat-top">Real registrado</div><strong>${pc(res.realGlobal)}</strong><span>${res.realGlobal == null ? 'sin avances aún' : 'actividades planificadas'}</span></div>
      <div class="ui-stat core-dev ${desvClase}"><div class="ui-stat-top">Desviación</div><strong>${ppf(res.desvGlobal)}</strong><span>real − plan, en puntos porcentuales</span></div>
      <div class="ui-stat"><div class="ui-stat-top">Alertas</div><strong>${alertas.filter((a) => a.nivel !== 'info').length}</strong><span>${res.conteo.criticas} críticas · ${res.conteo.atrasadas} atrasadas · ${res.conteo.sinReporte} sin reporte</span></div>
    </section>
    ${guardado ? `<p class="core-nota">${ic('check')}Cierre guardado el ${h(new Date(guardado.guardadoEn).toLocaleString('es-CL'))}.</p>` : ''}
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Alertas del turno</h2><p>Reglas claras: atraso ≥ ${cfg.umbralAtraso} pp, crítica ≥ ${cfg.umbralCritico} pp, datos desactualizados tras ${cfg.turnosSinAvance} turnos sin avance.</p></div>${ic('bell')}</div>
      <div class="core-alertas">${alertas.length ? alertas.map((a) => `<div class="core-alerta ${lvl[a.nivel][1]}"><span class="core-pill ${lvl[a.nivel][1]}">${lvl[a.nivel][0]}</span><div><strong>${h(a.titulo)}</strong><p>${h(a.detalle)}</p></div>${a.otNum != null ? `<button class="ui-text-button" data-open-ot="${h(a.otNum)}">Abrir</button>` : ''}</div>`).join('') : '<div class="ui-empty">Sin alertas en este turno.</div>'}</div></section>
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Actividades planificadas</h2><p>Plan = recta entre inicio y fin programados de cada OT. Emergentes y canceladas se muestran aparte.</p></div>
      <label class="core-check"><input type="checkbox" id="coreSoloAlertas" ${S.soloAlertas ? 'checked' : ''}> Solo con alerta</label></div>
      <div class="core-tabla-wrap"><table class="core-tabla"><thead><tr><th>OT</th><th>Actividad</th><th>Plan</th><th>Real</th><th>Desv.</th><th>Estado</th></tr></thead><tbody>
      ${filas.length ? filas.map((f) => { const n = nivelFila[f.nivel]; return `<tr><td><button class="ui-text-button" data-open-ot="${h(f.otNum)}">${h(f.otNum)}</button></td><td><strong>${h(f.descripcion)}</strong><small>${h(f.area)}${f.sinReporte ? ' · <b class="core-sr">sin reporte en el turno</b>' : ''}</small></td><td>${pc(f.plan)}</td><td>${pc(f.real)}</td><td class="${f.desv <= -cfg.umbralAtraso ? 'neg' : ''}">${ppf(f.desv)}</td><td><span class="core-pill ${n[1]}">${n[0]}</span></td></tr>`; }).join('') : '<tr><td colspan="6" class="core-vacio">Ninguna actividad coincide.</td></tr>'}
      </tbody></table></div></section>
    <div class="core-dos">
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Emergentes</h2><p>Sin línea base: no alteran el plan original.</p></div></div>
      ${res.emergentes.length ? res.emergentes.map((e) => `<div class="core-fila"><span><strong>${h(e.descripcion)}</strong><small>${e.hh} HH estimadas · ${h(e.area || '')}${e.nuevo ? ' · nuevo en el turno' : ''}</small></span><b>${pc(e.real)}</b></div>`).join('') : '<div class="ui-empty">Sin emergentes hasta este turno.</div>'}</section>
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Canceladas</h2><p>Fuera del cálculo de avance.</p></div></div>
      ${res.canceladas.length ? res.canceladas.map((c) => `<div class="core-fila"><span><strong>OT ${h(c.otNum)} · ${h(c.descripcion)}</strong><small>${h(c.motivo || 'Sin motivo registrado')}</small></span></div>`).join('') : '<div class="ui-empty">Ninguna cancelada.</div>'}</section>
    </div>
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Resumen del turno</h2><p>Texto listo para copiar o pegar en tu informe o mensaje.</p></div></div><pre class="core-pre" id="coreResumen">${h(C.resumenTurnoTexto(res, bitacoraDe(S.turno)))}</pre></section>
    <section class="ui-panel core-sec"><div class="ui-panel-heading"><div><h2>Cierres guardados</h2><p>Historial de este equipo (entra en el respaldo).</p></div></div>
      ${S.cierres.length ? S.cierres.slice().sort((a, b) => a.turnoIdx - b.turnoIdx).map((c) => `<div class="core-fila"><span><strong>${h(c.etiqueta)}</strong><small>${h(new Date(c.guardadoEn).toLocaleString('es-CL'))} · plan ${pc(c.planGlobal)} · real ${pc(c.realGlobal)} · ${ppf(c.desvGlobal)}</small></span><button class="ui-text-button" data-core="ver-cierre" data-i="${c.turnoIdx}">Ver</button></div>`).join('') : '<div class="ui-empty">Aún no hay cierres guardados.</div>'}</section>
    <details class="ui-panel core-sec core-ajustes"><summary>Reglas y avisos</summary><div class="core-form">
      <label>Atraso desde (puntos)<input type="number" id="cfgAtraso" min="1" max="100" value="${cfg.umbralAtraso}"></label>
      <label>Crítica desde (puntos)<input type="number" id="cfgCritico" min="1" max="100" value="${cfg.umbralCritico}"></label>
      <label>Turnos sin avance para "desactualizada"<input type="number" id="cfgTurnos" min="1" max="10" value="${cfg.turnosSinAvance}"></label>
      <label>Hora de corte (turno día)<input type="time" id="cfgCorteA" value="${cfg.corteA}"></label>
      <label>Hora de corte (turno noche)<input type="time" id="cfgCorteB" value="${cfg.corteB}"></label>
      <label class="core-check"><input type="checkbox" id="cfgAviso" ${cfg.avisoActivo ? 'checked' : ''}> Avisarme a la hora de corte (con la app abierta)</label>
      <button class="ui-button primary" data-core="guardar-cfg">Guardar reglas</button></div></details>`;
  }

  // ---- 3) WhatsApp
  function htmlWhatsApp() {
    const w = S.wa;
    const intro = `<section class="ui-panel core-sec core-pad"><div class="ui-panel-heading"><div><h2>Importar el chat de WhatsApp de los supervisores</h2><p>En WhatsApp: abre el grupo → ⋮ → Más → Exportar chat → <b>Incluir archivos</b>. Elige aquí el .zip resultante. Se procesa en este equipo; no se envía a ningún servicio.</p></div>${ic('chat')}</div>
      <div class="core-subir"><label class="ui-button primary">${ic('upload')}Elegir chat (.zip o .txt)<input type="file" id="coreWaArchivo" accept=".zip,.txt,application/zip,text/plain" hidden></label>
      <span class="core-nota-inline">Los mensajes se agrupan por turno según la hora y se asignan a una OT por su número, TAG (ej. 322ZM301) o nombre. Lo que no calce lo asignas tú.</span></div></section>`;
    if (!w) return intro;
    if (w.error) return intro + `<div class="ui-panel core-pad core-err">${h(w.error)}</div>`;
    const p = w.props, ots = allOts();
    const sel = p.filter((x) => x.incluir).length;
    const sinOt = p.filter((x) => x.otNum == null).length, fuera = p.filter((x) => x.turnoIdx < 0).length;
    const nFotos = p.reduce((n, x) => n + x.adjuntos.filter((a) => w.archivos.has(a.toLowerCase())).length, 0);
    const porTurno = new Map();
    p.forEach((x) => { const k = x.turnoIdx; if (!porTurno.has(k)) porTurno.set(k, []); porTurno.get(k).push(x); });
    const opts = (cur) => `<option value="">— sin asignar —</option>${ots.map((o) => `<option value="${h(o.otNum)}" ${String(o.otNum) === String(cur) ? 'selected' : ''}>${h(o.manual ? o.descripcion : 'OT ' + o.otNum + ' · ' + o.descripcion).slice(0, 70)}</option>`).join('')}`;
    const bloques = [...porTurno.entries()].sort((a, b) => (a[0] < 0 ? 99 : a[0]) - (b[0] < 0 ? 99 : b[0])).map(([k, lista]) => `
      <div class="core-wa-turno"><h3>${k >= 0 ? h(SEED_DATA.turnoLabels[k]) : 'Fuera de las fechas de la parada (no se importan)'}</h3>
      ${lista.map((x) => `<div class="core-wa-msg ${x.incluir ? 'on' : ''}" data-id="${x.id}">
        <input type="checkbox" data-wa-inc="${x.id}" ${x.incluir ? 'checked' : ''} ${x.turnoIdx < 0 ? 'disabled' : ''} aria-label="Importar este mensaje">
        <div class="core-wa-cuerpo"><div class="core-wa-meta">${h(x.fecha.slice(8, 10) + '/' + x.fecha.slice(5, 7))} ${h(x.hora)} · ${h(x.autor)}${x.motivo ? ` · <i>${h(x.motivo)}</i>` : ''}</div>
          ${x.texto ? `<div class="core-wa-texto">${h(x.texto)}</div>` : ''}
          <div class="core-wa-fotos" data-fotos="${x.id}">${x.adjuntos.map((a) => w.archivos.has(a.toLowerCase()) ? `<span class="core-wa-th" data-arch="${h(a)}"></span>` : `<span class="core-wa-nofoto">${h(a)} (no incluida)</span>`).join('')}${x.omitido ? '<span class="core-wa-nofoto">foto omitida al exportar</span>' : ''}</div></div>
        <select data-wa-ot="${x.id}" aria-label="OT de este mensaje">${opts(x.otNum)}</select></div>`).join('')}</div>`).join('');
    return intro + `<section class="ui-panel core-sec core-pad"><div class="core-wa-resumen"><strong>${p.length}</strong> mensajes útiles de ${w.total} leídos · <strong>${nFotos}</strong> fotos · <strong>${sinOt}</strong> sin OT · ${fuera ? `<strong>${fuera}</strong> fuera de la parada · ` : ''}<strong>${sel}</strong> marcados para importar</div>
      <div class="core-bar-actions"><button class="ui-button" data-core="wa-marcar-con-ot">Marcar los que tienen OT</button><button class="ui-button" data-core="wa-desmarcar">Desmarcar todo</button>
      <button class="ui-button primary" data-core="wa-importar" ${sel ? '' : 'disabled'}>${ic('upload')}Importar ${sel} mensajes a la bitácora</button></div>
      <p class="core-nota-inline">Revisa antes de importar: las sugerencias salen de reglas (número de OT, TAG, nombre), no de adivinar. Un chat ya importado no se duplica.</p></section>${bloques}`;
  }
  function pintarFotosWhatsApp() {
    const w = S.wa; if (!w || w.error) return;
    document.querySelectorAll('.core-wa-th').forEach(async (el) => {
      const arch = el.dataset.arch; if (el.dataset.ok) return; el.dataset.ok = '1';
      try {
        const entry = w.archivos.get(arch.toLowerCase());
        if (!/\.(jpe?g|png|webp)$/i.test(arch)) { el.textContent = arch; return; }
        if (!w.urls.has(arch)) w.urls.set(arch, URL.createObjectURL(new Blob([await entry.async('uint8array')], { type: /png$/i.test(arch) ? 'image/png' : 'image/jpeg' })));
        el.innerHTML = `<img alt="${h(arch)}" src="${w.urls.get(arch)}">`;
      } catch (e) { el.textContent = arch; }
    });
  }

  // ---- 4) IA (copiar y pegar)
  function htmlIA() {
    const res = evaluar(S.turno);
    const prompt = C.promptParaIA(res, bitacoraDe(S.turno), { cliente: (window.BRANDING || {}).cliente, area: (window.BRANDING || {}).area, parada: paradaNombre() });
    return `<div class="core-bar">${selectorTurno()}<div class="core-bar-actions"><button class="ui-button primary" data-core="copiar-prompt">${ic('copy')}Copiar texto para la IA</button></div></div>
    <section class="ui-panel core-sec core-pad"><div class="ui-panel-heading"><div><h2>Modo gratuito: copiar y pegar</h2><p>1) Copia el texto de abajo. 2) Pégalo en el chat de IA que quieras (ChatGPT, Claude, Gemini… las versiones gratuitas sirven). 3) Pega aquí su respuesta y guárdala como borrador.</p></div>${ic('spark')}</div>
      <div class="core-aviso">${ic('warn')}<span>Los números ya están calculados por la app y la IA solo redacta. <b>Revisa siempre lo que escriba</b>: puede equivocarse. No envíes datos que tu cliente no permita compartir con un servicio externo; si dudas, borra del texto los nombres antes de pegarlo.</span></div>
      <label class="core-label">Texto para pegar en la IA (editable)</label><textarea id="corePrompt" class="core-area" rows="14">${h(prompt)}</textarea></section>
    <section class="ui-panel core-sec core-pad"><label class="core-label">Respuesta de la IA (pégala aquí)</label><textarea id="coreRespuesta" class="core-area" rows="10" placeholder="Pega aquí el borrador que te devolvió la IA…">${h(S.ia.respuesta || (S.cierres.find((c) => c.id === 'turno-' + S.turno) || {}).borradorIA || '')}</textarea>
      <div class="core-bar-actions"><button class="ui-button" data-core="copiar-respuesta">${ic('copy')}Copiar respuesta</button><button class="ui-button primary" data-core="guardar-borrador">${ic('save')}Guardar como borrador de este cierre</button></div>
      <p class="core-nota-inline">El borrador queda guardado junto al cierre de este turno, marcado como "redactado con IA — pendiente de revisión humana".</p></section>`;
  }

  // ------------------------------------------------------------------ eventos de la vista
  async function copiar(texto, msg) {
    try { await navigator.clipboard.writeText(texto); toast(msg || 'Copiado ✓'); }
    catch (e) { const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(msg || 'Copiado ✓'); } catch (e2) { toast('No se pudo copiar'); } t.remove(); }
  }
  const cierresCol = () => state.db.collection('paradas').doc(PARADA_ID).collection('cierres');

  async function guardarCierre(conBorrador) {
    const res = evaluar(S.turno);
    const previo = S.cierres.find((c) => c.id === 'turno-' + S.turno) || {};
    const doc = {
      turnoIdx: S.turno, etiqueta: res.etiqueta, guardadoEn: Date.now(),
      planGlobal: res.planGlobal, realGlobal: res.realGlobal, desvGlobal: res.desvGlobal, conteo: res.conteo,
      alertas: res.alertas.slice(0, 40).map((a) => ({ nivel: a.nivel, titulo: a.titulo, detalle: a.detalle, otNum: a.otNum == null ? null : a.otNum })),
      texto: C.resumenTurnoTexto(res, bitacoraDe(S.turno)), reglas: res.cfg,
    };
    const borrador = conBorrador != null ? conBorrador : previo.borradorIA;
    if (borrador) { doc.borradorIA = borrador; doc.borradorIAEstado = 'redactado con IA — pendiente de revisión humana'; }
    await cierresCol().doc('turno-' + S.turno).set(doc, { merge: true });   // id fijo por turno: guardar dos veces no duplica
  }

  async function onClickVista(e) {
    const tab = e.target.closest('[data-core-tab]'); if (tab) { S.tab = tab.dataset.coreTab; render(); return; }
    const b = e.target.closest('[data-core]'); if (!b) return;
    const acc = b.dataset.core;
    try {
      if (acc === 'copiar-resumen') await copiar($('coreResumen').textContent, 'Resumen copiado ✓');
      else if (acc === 'ir-ia') { S.tab = 'ia'; render(); }
      else if (acc === 'guardar-cierre') { await guardarCierre(); toast('Cierre guardado ✓'); render(); }
      else if (acc === 'ver-cierre') { const c = S.cierres.find((x) => x.turnoIdx === +b.dataset.i); if (c) { S.turno = c.turnoIdx; S.tab = 'cierre'; render(); window.scrollTo(0, 0); } }
      else if (acc === 'guardar-cfg') {
        const c = { umbralAtraso: +$('cfgAtraso').value || 10, umbralCritico: +$('cfgCritico').value || 25, turnosSinAvance: +$('cfgTurnos').value || 2, avisoActivo: $('cfgAviso').checked, corteA: $('cfgCorteA').value || '08:00', corteB: $('cfgCorteB').value || '20:00' };
        if (c.umbralCritico < c.umbralAtraso) { toast('El umbral crítico debe ser mayor o igual al de atraso'); return; }
        guardarCfg(c); toast('Reglas guardadas ✓'); render();
      }
      else if (acc === 'copiar-prompt') await copiar($('corePrompt').value, 'Texto copiado — pégalo en tu chat de IA ✓');
      else if (acc === 'copiar-respuesta') await copiar($('coreRespuesta').value, 'Respuesta copiada ✓');
      else if (acc === 'guardar-borrador') {
        const txt = $('coreRespuesta').value.trim(); if (!txt) { toast('Pega primero la respuesta de la IA'); return; }
        S.ia.respuesta = txt; await guardarCierre(txt); toast('Borrador guardado en el cierre de este turno ✓');
      }
      else if (acc === 'wa-marcar-con-ot') { S.wa.props.forEach((x) => { x.incluir = x.otNum != null && x.turnoIdx >= 0; }); render(); }
      else if (acc === 'wa-desmarcar') { S.wa.props.forEach((x) => { x.incluir = false; }); render(); }
      else if (acc === 'wa-importar') await importarWhatsApp(b);
    } catch (err) { console.error(err); toast('No se pudo completar: ' + (err.message || err)); }
  }

  function onChangeVista(e) {
    const t = e.target;
    if (t.id === 'coreTurno') { S.turno = +t.value; render(); }
    else if (t.id === 'coreSoloAlertas') { S.soloAlertas = t.checked; render(); }
    else if (t.id === 'coreWaArchivo') leerArchivoWhatsApp(t.files[0]);
    else if (t.dataset.waInc != null) { const x = S.wa.props.find((p) => p.id === +t.dataset.waInc); if (x) { x.incluir = t.checked; render(); } }
    else if (t.dataset.waOt != null) {
      const x = S.wa.props.find((p) => p.id === +t.dataset.waOt);
      if (x) { x.otNum = t.value === '' ? null : (allOts().find((o) => String(o.otNum) === t.value) || {}).otNum; x.incluir = x.otNum != null && x.turnoIdx >= 0; x.motivo = x.otNum != null ? 'asignada por ti' : ''; render(); }
    }
  }

  // ------------------------------------------------------------------ WhatsApp: leer e importar
  async function leerArchivoWhatsApp(file) {
    if (!file) return;
    S.wa = { cargando: true }; toast('Leyendo el chat…');
    try {
      let texto = '', archivos = new Map();
      if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
        const chat = nombres.find((n) => /(^|\/)_?chat\.txt$/i.test(n)) || nombres.find((n) => /\.txt$/i.test(n));
        if (!chat) throw new Error('El .zip no trae el archivo de texto del chat (_chat.txt). Exporta el chat de nuevo.');
        texto = await zip.files[chat].async('string');
        nombres.forEach((n) => { if (n !== chat) archivos.set(n.split('/').pop().toLowerCase(), zip.files[n]); });
      } else texto = await file.text();
      const r = C.parseChatWhatsApp(texto);
      if (!r.mensajes.length) throw new Error('No se reconocieron mensajes de WhatsApp en ese archivo. ¿Es el chat exportado (.txt dentro del .zip)?');
      const props = C.proponerDesdeChat(r.mensajes, allOts(), SEED_DATA.turnos);
      props.forEach((x) => { x.incluir = x.otNum != null && x.turnoIdx >= 0; });
      S.wa = { props, total: r.mensajes.length, archivos, urls: new Map(), nombre: file.name };
    } catch (e) { console.error(e); S.wa = { error: e.message || 'No se pudo leer el archivo.' }; }
    render();
  }

  const claveWa = (x) => `${x.ts}|${x.autor}|${(x.texto || '').slice(0, 40)}|${x.adjuntos.join(',')}`;
  const waKey = () => 'core.wa.' + PARADA_ID;
  function yaImportados() { try { return new Set(JSON.parse(localStorage.getItem(waKey()) || '[]')); } catch (e) { return new Set(); } }

  async function importarWhatsApp(btn) {
    const w = S.wa, ya = yaImportados();
    const nuevos = w.props.filter((x) => x.incluir && !ya.has(claveWa(x)));
    const omitidos = w.props.filter((x) => x.incluir).length - nuevos.length;
    if (!nuevos.length) { toast(omitidos ? 'Esos mensajes ya fueron importados antes.' : 'No hay mensajes marcados.'); return; }
    const entradas = C.armarEntradasBitacora(nuevos, allOts(), SEED_DATA.turnos);
    if (!confirm(`Se crearán ${entradas.length} registros de bitácora (${nuevos.length} mensajes${omitidos ? `, ${omitidos} ya importados se omiten` : ''}). ¿Importar?`)) return;
    btn.disabled = true; const original = btn.innerHTML;
    let hechas = 0, fotosOk = 0, fotosMal = 0;
    try {
      for (const en of entradas) {
        btn.textContent = `Importando ${++hechas} de ${entradas.length}…`;
        const fotos = [];
        for (const f of en.fotosPendientes) {
          const entry = w.archivos.get(f.archivo.toLowerCase());
          if (!entry || !/\.(jpe?g|png|webp)$/i.test(f.archivo)) { fotosMal++; continue; }
          try {
            const bytes = await entry.async('uint8array');
            const file = new File([bytes], f.archivo, { type: /png$/i.test(f.archivo) ? 'image/png' : /webp$/i.test(f.archivo) ? 'image/webp' : 'image/jpeg' });
            const ref = firebase.storage().ref(`paradas/${PARADA_ID}/bitacora/${en.otNum}_${Date.now()}_${f.archivo}`);
            await ref.put(await comprimirImagenParaSubir(file));
            fotos.push({ url: await ref.getDownloadURL(), descripcion: f.descripcion || '' }); fotosOk++;
          } catch (err) { console.error(err); fotosMal++; }
        }
        const { fotosPendientes, msgs, ...base } = en;
        await bitacoraCollection().add({ ...base, fotos, createdAt: Date.now() });
      }
      nuevos.forEach((x) => ya.add(claveWa(x)));
      try { localStorage.setItem(waKey(), JSON.stringify([...ya])); } catch (e) { /* sin memoria de importados */ }
      toast(`Importado ✓ ${entradas.length} registros, ${fotosOk} fotos${fotosMal ? `, ${fotosMal} sin importar` : ''}`);
      S.wa = null; S.tab = 'cierre'; render();
    } finally { btn.disabled = false; btn.innerHTML = original; }
  }

  // ------------------------------------------------------------------ 1) Chequeo de informe
  function datosChequeo(informe) {
    const ots = (informe.otNums || []).map((n) => allOts().find((o) => String(o.otNum) === String(n))).filter(Boolean);
    const T = SEED_DATA.turnos;
    return {
      informe, brand: window.BRANDING || {}, ots, bitacora: state.bitacora || [], componentes: state.componentes || [],
      progressAtFinal: (ot) => otProgressAt(ot, T.length - 1), supervisorDe: (n, t) => getOtSupervisor(n, t),
      urlsDistribucion: typeof urlsDistribucionInforme === 'function' ? urlsDistribucionInforme(informe) : [],
      rangoFechas: { min: T[0].slice(0, 10), max: new Date(new Date(T[T.length - 1]).getTime() + 12 * 3600e3).toISOString().slice(0, 10) },
    };
  }
  function abrirChequeo() {
    const inf = state.informeActivo; if (!inf) return null;
    const r = C.chequearInforme(datosChequeo(inf));
    let back = $('coreChequeoBackdrop');
    if (!back) { back = document.createElement('div'); back.className = 'sheet-backdrop'; back.id = 'coreChequeoBackdrop'; back.innerHTML = '<div class="sheet core-chequeo" role="dialog" aria-modal="true" aria-labelledby="coreChequeoTitulo"></div>'; document.body.appendChild(back); back.addEventListener('click', (ev) => { if (ev.target === back || ev.target.closest('[data-core-cerrar]')) back.classList.remove('open'); }); }
    const nivel = { falta: ['Falta', 'crit'], revisar: ['Revisar', 'warn'], info: ['Nota', 'info'], ok: ['Listo', 'ok'] };
    back.querySelector('.sheet').innerHTML = `<h2 id="coreChequeoTitulo">¿Listo para entregar?</h2>
      <p class="core-chq-resumen ${r.listo ? 'ok' : 'crit'}">${ic(r.listo ? 'check' : 'warn')}${r.listo ? 'No faltan datos obligatorios.' : `Faltan ${r.faltan} dato(s) obligatorio(s).`} ${r.revisar ? `${r.revisar} punto(s) para revisar.` : ''}</p>
      <div class="core-chq-lista">${r.items.map((x) => `<div class="core-chq ${nivel[x.nivel][1]}"><span class="core-pill ${nivel[x.nivel][1]}">${nivel[x.nivel][0]}</span><div><strong>${h(x.titulo)}</strong><small>${h(x.seccion)}</small>${x.detalle ? `<p>${h(x.detalle)}</p>` : ''}</div></div>`).join('')}</div>
      <div class="sheet-actions"><button class="btn ghost" data-core-cerrar>Cerrar</button></div>`;
    back.classList.add('open');
    return r;
  }
  function asegurarBotonChequeo() {
    const acciones = document.querySelector('#view-informe-detalle .ui-report-actions') || document.querySelector('#view-informe-detalle');
    if (!acciones || $('btnChequeoInforme')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btnChequeoInforme'; b.className = 'btn-entrar core-btn-chq';
    b.innerHTML = `${ic('check')}Revisar antes de entregar`;
    const ref = $('btnEditarComoDocumento');
    if (ref && ref.parentElement === acciones) acciones.insertBefore(b, ref); else acciones.prepend(b);
    b.addEventListener('click', abrirChequeo);
  }
  // Al descargar el Word: si faltan datos obligatorios, avisa antes (se puede descargar igual).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#btnRellenarWordInforme'); if (!btn || !state.informeActivo) return;
    let r; try { r = C.chequearInforme(datosChequeo(state.informeActivo)); } catch (err) { return; }
    if (!r.listo && !confirm(`Antes de descargar: faltan ${r.faltan} dato(s) obligatorio(s) del informe.\n\n• ${r.items.filter((x) => x.nivel === 'falta').slice(0, 5).map((x) => x.titulo).join('\n• ')}\n\n¿Descargar el Word de todas formas?\n(Cancela y pulsa "Revisar antes de entregar" para ver todo.)`)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ------------------------------------------------------------------ aviso a la hora de corte
  function revisarCorte() {
    const cfg = cargarCfg(); if (!cfg.avisoActivo) return;
    const now = new Date(), hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (hhmm !== cfg.corteA && hhmm !== cfg.corteB) return;
    const clave = 'core.corte.' + PARADA_ID + '.' + now.toISOString().slice(0, 10) + '.' + hhmm;
    try { if (localStorage.getItem(clave)) return; localStorage.setItem(clave, '1'); } catch (e) { /* sigue sin memoria */ }
    let bn = $('coreAvisoCorte');
    if (!bn) { bn = document.createElement('div'); bn.id = 'coreAvisoCorte'; document.body.appendChild(bn); }
    bn.innerHTML = `${ic('bell')}<span>Hora de corte (${hhmm}): revisa el cierre de turno.</span><button class="ui-button primary" data-core-abrir>Abrir cierre</button><button class="ui-text-button" data-core-cerrar-aviso>Ahora no</button>`;
    bn.classList.add('open');
    bn.onclick = (ev) => { if (ev.target.closest('[data-core-abrir]')) { bn.classList.remove('open'); S.turno = turnoPorDefecto(); S.tab = 'cierre'; document.querySelector('#workspaceNav [data-route="control"]')?.click(); } else if (ev.target.closest('[data-core-cerrar-aviso]')) bn.classList.remove('open'); };
  }

  // ------------------------------------------------------------------ arranque
  function iniciar() {
    construirVista();
    if (!state.db) { setTimeout(iniciar, 400); return; }
    try { cierresCol().onSnapshot((snap) => { S.cierres = []; snap.forEach((d) => S.cierres.push({ id: d.id, ...d.data() })); if (document.body.dataset.page === 'control') render(); }); } catch (e) { console.warn('Cierres no disponibles', e); }
    window.addEventListener('paradas:navigate', (ev) => {
      if (ev.detail === 'control') { S.turno = S.turno == null ? turnoPorDefecto() : S.turno; render(); }
      if (ev.detail === 'informe-detalle') setTimeout(asegurarBotonChequeo, 50);
    });
    window.addEventListener('paradas:render', () => { if (document.body.dataset.page === 'control' && S.tab !== 'whatsapp' && S.tab !== 'ia') render(); });
    setInterval(revisarCorte, 30000);
  }
  document.addEventListener('DOMContentLoaded', async () => { try { await window.ParadasCatalog?.ready; } catch (e) { /* sigue */ } setTimeout(iniciar, 0); });
  window.CoreUI = { render, abrirChequeo, S };
})();
