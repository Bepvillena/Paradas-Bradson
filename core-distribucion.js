/* CORE · Bitácora de Paradas de Planta — Distribución de la parada en A4 (PDF o imagen).
   Misma información que el cuadro de distribución diaria: días y horas (de 2 en 2), equipo/área a la izquierda,
   título de cada trabajo en negrita, actividades con su barra (color por cuadrilla) y bloques grises de terceros.
   Tres estilos visuales (A clásico, B corporativo, C moderno) con exactamente los mismos datos. */
(function () {
  'use strict';
  const PW = 297, PH = 210;                                    // A4 horizontal, en mm
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = (n) => String(n).padStart(2, '0');
  const f = (n) => (Math.round(n * 100) / 100).toString();

  // ---------------------------------------------------------------- estilos
  const PALETA = {
    A: ['#F4B084', '#92D050', '#FFD966', '#9DC3E6', '#C9A7E0', '#F29BB5', '#5BC0BE', '#BFA98A'],
    B: ['#1F8A8A', '#2F6DA8', '#E0902A', '#7B5EA7', '#C8503F', '#5E9441', '#B58A12', '#566B78'],
    C: ['#FF8A65', '#26A69A', '#FFCA28', '#5C9DF2', '#B565D1', '#7CC47F', '#F2679A', '#A1887F'],
  };
  const ESTILOS = {
    A: { id: 'A', nombre: 'Clásico', desc: 'Idéntico al cuadro de Excel, más limpio y legible.', fam: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
      fsTxt: 2.5, fsOt: 2.5, fsDia: 2.7, fsHora: 2.0, tituloH: 9, leyendaH: 6, pieH: 0,
      lineaHora: ['#000', .12], lineaDia: ['#000', .35], lineaFila: ['#000', .12], marco: ['#000', .5], sepGrupo: ['#000', .55],
      zebra: null, otFill: null, barraRad: 0, barraPad: 0, barraBorde: null, diaFill: '#fff', diaColor: '#000', horaFill: '#fff', horaColor: '#000',
      tercFill: '#D9D9D9', tercColor: '#000', tercRayas: false, etqFill: '#fff', etqColor: '#000', sangria: 0, banda: false, pie: false },
    B: { id: 'B', nombre: 'Corporativo', desc: 'Cabecera con la marca, tabla ordenada y leyenda de cuadrillas.', fam: '"Segoe UI", Calibri, Carlito, Arial, sans-serif',
      fsTxt: 2.4, fsOt: 2.45, fsDia: 2.6, fsHora: 1.9, tituloH: 19, leyendaH: 7, pieH: 5,
      lineaHora: ['#C9D3DA', .1], lineaDia: ['#5D6F7B', .3], lineaFila: ['#E3E9ED', .12], marco: ['#5D6F7B', .35], sepGrupo: ['#5D6F7B', .45],
      zebra: '#F6F9FB', otFill: '#E9F0F4', barraRad: .5, barraPad: .55, barraBorde: 'rgba(0,0,0,.18)', diaFill: '#2E4350', diaColor: '#fff', horaFill: '#EAF0F4', horaColor: '#2E4350',
      tercFill: '#CDD3D8', tercColor: '#3b4a54', tercRayas: true, etqFill: '#2E4350', etqColor: '#fff', sangria: 1.6, banda: true, pie: true },
    C: { id: 'C', nombre: 'Moderno', desc: 'Minimalista: pocas líneas, barras tipo píldora y encabezado oscuro.', fam: '"Segoe UI", Calibri, Carlito, Arial, sans-serif',
      fsTxt: 2.4, fsOt: 2.45, fsDia: 2.6, fsHora: 1.9, tituloH: 16, leyendaH: 7, pieH: 5,
      lineaHora: ['#EEF1F4', .08], lineaDia: ['#B9C2CC', .25], lineaFila: ['#F1F3F6', .1], marco: null, sepGrupo: ['#DDE3E9', .3],
      zebra: null, otFill: null, barraRad: 1.1, barraPad: .75, barraBorde: null, diaFill: '#fff', diaColor: '#1C2733', horaFill: '#fff', horaColor: '#8693A0',
      tercFill: 'none', tercColor: '#6B7885', tercRayas: false, tercDash: true, etqFill: '#F1F4F7', etqColor: '#1C2733', sangria: 1.8, banda: true, pie: true, oscuro: true },
  };

  // ---------------------------------------------------------------- medición de texto
  const ctx = document.createElement('canvas').getContext('2d');
  function medir(txt, size, bold, fam) { ctx.font = `${bold ? '700' : '400'} ${size * 10}px ${fam}`; return ctx.measureText(txt).width / 10; }
  function envolver(txt, size, bold, maxW, fam, maxLineas) {
    const palabras = String(txt).split(/\s+/).filter(Boolean), lineas = [];
    let actual = '';
    palabras.forEach((w) => {
      const t = actual ? actual + ' ' + w : w;
      if (medir(t, size, bold, fam) <= maxW || !actual) actual = t; else { lineas.push(actual); actual = w; }
    });
    if (actual) lineas.push(actual);
    if (maxLineas && lineas.length > maxLineas) {
      const r = lineas.slice(0, maxLineas); let u = r[maxLineas - 1];
      while (u.length > 1 && medir(u + '…', size, bold, fam) > maxW) u = u.slice(0, -1);
      r[maxLineas - 1] = u + '…'; return r;
    }
    return lineas.length ? lineas : [''];
  }

  // ---------------------------------------------------------------- datos de la parada
  function modelo() {
    const T = SEED_DATA.turnos;
    const ini = new Date(T[0]), fin = new Date(new Date(T[T.length - 1]).getTime() + 12 * 3600e3);
    const t0 = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate(), 0, 0, 0).getTime();
    const nDias = Math.ceil((fin.getTime() - t0) / 864e5);
    const dias = Array.from({ length: nDias }, (_, i) => { const d = new Date(t0 + i * 864e5); return { texto: `${DIAS[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)}` }; });
    const ots = SEED_DATA.ots.filter((o) => o.tipo !== 'Emergente');
    const orden = [...new Set(ots.map((o) => o.area))];
    const grupos = orden.map((area) => ({ area, ots: ots.filter((o) => o.area === area) }));
    const cuadrillas = [...new Set(ots.map((o) => o.cuadrilla).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
    const comps = SEED_DATA.complementarias || [];
    return { t0, nDias, dias, grupos, cuadrillas, comps, ini, fin };
  }

  // ---------------------------------------------------------------- composición de páginas
  function componer(estilo, opciones) {
    const st = ESTILOS[estilo], M = modelo(), o = opciones || {};
    const resumen = o.modo === 'resumen';
    const supH = 3.4, FS_ETQ = 1.55, FS_NOM = 2.15;
    const ETQ = { A: { txt: 'DÍA', fill: '#F2B33D', color: '#3A2800' }, B: { txt: 'NOCHE', fill: '#33506E', color: '#FFFFFF' } };
    const anchoSeg = (s) => (s.tipo === 'etq' ? medir(s.txt, FS_ETQ, true, st.fam) + 1.7 + 0.8 : medir(s.txt, FS_NOM, true, st.fam) + 2.2);
    const supLineas = (ot) => {
      if (!o.supervisores || typeof getOtSupervisor !== 'function') return [];
      const partes = [];
      ['A', 'B'].forEach((t) => { const n = getOtSupervisor(ot.otNum, t); if (n) partes.push([{ tipo: 'etq', t, txt: ETQ[t].txt }, { tipo: 'nom', txt: n }]); });
      if (!partes.length) return [];
      const maxW = txtW - 1.6, total = partes.reduce((n, p) => n + p.reduce((m, s) => m + anchoSeg(s), 0), 0);
      return total <= maxW ? [partes.flat()] : partes;      // si no caben en una línea, cada turno va en la suya
    };           // una sola fila por trabajo, con las barras de todos sus pasos en esa línea
    const marg = 8, labW = 9, txtW = 60;
    const gridX = marg + labW + txtW, gridW = PW - marg - gridX, nCol = M.nDias * 12, colW = gridW / nCol;
    const x = (ms) => gridX + ((ms - M.t0) / (M.nDias * 864e5)) * gridW;
    const color = (c) => PALETA[st.id][Math.max(0, M.cuadrillas.indexOf(c)) % PALETA[st.id].length];
    const lineH = st.fsTxt * 1.28, padV = 0.9;

    // filas: [{tipo:'ot'|'sub', ...}] agrupadas en bloques (un bloque = un trabajo con sus actividades; no se parte entre páginas)
    const bloques = [];
    M.grupos.forEach((g) => g.ots.forEach((ot) => {
      if (resumen) {
        const subsR = (ot.subactividades || []).filter((s) => s.inicio && s.fin);
        if (!subsR.length && ot.inicio && ot.fin) subsR.push({ nombre: ot.descripcion, inicio: ot.inicio, fin: ot.fin });
        const tercR = M.comps.filter((c) => c.otRelacionada === ot.otNum);
        const lR = envolver(ot.descripcion, st.fsOt, true, txtW - 1.6, st.fam, 2);
        const sL = supLineas(ot);
        const fila = { tipo: 'res', ot, subs: subsR, terc: tercR, lineas: lR, supL: sL, h: Math.max(lR.length * lineH + sL.length * supH + padV * 2, tercR.length ? 7 : 5.6) };
        bloques.push({ area: g.area, filas: [fila], h: fila.h });
        return;
      }
      const filas = [];
      const lH = envolver(ot.descripcion, st.fsOt, true, txtW - 1.6 - st.sangria * 0, st.fam, 3);
      const terc = M.comps.filter((c) => c.otRelacionada === ot.otNum);
      const sL = supLineas(ot);
      filas.push({ tipo: 'ot', ot, lineas: lH, supL: sL, h: Math.max(lH.length * lineH + sL.length * supH + padV * 2, 4.8), terc });
      const subs = (ot.subactividades || []).filter((s) => s.inicio && s.fin);
      if (!subs.length && ot.inicio && ot.fin) subs.push({ nombre: ot.descripcion, inicio: ot.inicio, fin: ot.fin, propia: true });
      subs.forEach((s) => { const l = envolver(s.nombre, st.fsTxt, false, txtW - 1.6 - st.sangria, st.fam, 3); filas.push({ tipo: 'sub', sub: s, ot, lineas: l, h: Math.max(l.length * lineH + padV * 2, 4.4) }); });
      bloques.push({ area: g.area, filas, h: filas.reduce((n, r) => n + r.h, 0) });
    }));

    const yTabla = marg + st.tituloH, hHead = 6.2 + 4.6;                         // fila de días + fila de horas
    const yFilas = yTabla + hHead;
    const yMax = PH - marg - st.leyendaH - st.pieH;
    const paginas = []; let pag = null, yCur = 0;
    bloques.forEach((b) => {
      if (!pag || yCur + b.h > yMax) { pag = { bloques: [] }; paginas.push(pag); yCur = yFilas; }
      pag.bloques.push(b); yCur += b.h;
    });
    const total = paginas.length || 1;

    const svgs = paginas.map((pagina, ip) => {
      const out = [];
      const L = (x1, y1, x2, y2, c, w, extra) => out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${w}"${extra || ''}/>`);
      const R = (rx, ry, rw, rh, fill, extra) => out.push(`<rect x="${f(rx)}" y="${f(ry)}" width="${f(rw)}" height="${f(rh)}" fill="${fill}"${extra || ''}/>`);
      const T = (tx, ty, txt, size, bold, col, anchor, extra) => out.push(`<text x="${f(tx)}" y="${f(ty)}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${col}" text-anchor="${anchor || 'start'}"${extra || ''}>${esc(txt)}</text>`);

      out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}" font-family='${st.fam.replace(/'/g, '')}'>`);
      out.push(`<defs><pattern id="ray" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.4" height="1.4" fill="${st.tercFill}"/><line x1="0" y1="0" x2="0" y2="1.4" stroke="#fff" stroke-width=".5"/></pattern></defs>`);
      R(0, 0, PW, PH, '#fff');

      // ---- encabezado de página (título, parada, logos)
      if (st.id === 'A') {
        T(marg, marg + 4.2, 'DISTRIBUCIÓN DE LA PARADA', 3.6, true, '#000');
        T(marg + 62, marg + 4.2, `${(SEED_DATA.paradaNombre || '').replace(/ — FCR&M$/, '')} · ${M.dias[0].texto.split(' ')[1]} al ${M.dias[M.dias.length - 1].texto.split(' ')[1]}`, 2.7, false, '#000');
      } else if (st.id === 'B') {
        const bc = (window.BRANDING && window.BRANDING.colorRGB) || [31, 160, 165];
        R(0, 0, PW, 15.5, `rgb(${bc[0]},${bc[1]},${bc[2]})`);
        T(marg, 7, 'DISTRIBUCIÓN DE LA PARADA', 4.6, true, '#fff');
        T(marg, 12, `${(SEED_DATA.paradaNombre || '').replace(/ — FCR&M$/, '')}  ·  ${M.dias[0].texto.split(' ')[1]} al ${M.dias[M.dias.length - 1].texto.split(' ')[1]}`, 2.9, false, 'rgba(255,255,255,.92)');
        if (o.logos) { let lx = PW - marg; o.logos.slice().reverse().forEach((lg) => { const w = lg.w * (9 / lg.h); lx -= w; out.push(`<rect x="${f(lx - .8)}" y="3.2" width="${f(w + 1.6)}" height="9.2" rx="1" fill="#fff"/><image href="${lg.data}" x="${f(lx)}" y="3.6" width="${f(w)}" height="8.4" preserveAspectRatio="xMidYMid meet"/>`); lx -= 3; }); }
      } else {
        T(marg, marg + 3.6, 'DISTRIBUCIÓN DE LA PARADA', 5, true, '#1C2733');
        T(marg, marg + 8.6, `${(SEED_DATA.paradaNombre || '').replace(/ — FCR&M$/, '')}  ·  ${M.dias[0].texto.split(' ')[1]} al ${M.dias[M.dias.length - 1].texto.split(' ')[1]}`, 2.8, false, '#6B7885');
        R(marg, marg + 11.2, 22, .9, (window.BRANDING && window.BRANDING.colorRGB) ? `rgb(${window.BRANDING.colorRGB.join(',')})` : '#26A69A');
        if (o.logos) { let lx = PW - marg; o.logos.slice().reverse().forEach((lg) => { const w = lg.w * (8 / lg.h); lx -= w; out.push(`<image href="${lg.data}" x="${f(lx)}" y="${marg}" width="${f(w)}" height="8" preserveAspectRatio="xMidYMid meet"/>`); lx -= 4; }); }
      }

      // ---- cabecera de la tabla: días y horas
      const yH1 = yTabla, yH2 = yTabla + 6.2, yBase = yFilas;
      R(gridX, yH1, gridW, 6.2, st.diaFill); R(gridX, yH2, gridW, 4.6, st.horaFill);
      if (st.id === 'B') R(marg, yH1, labW + txtW, hHead, '#2E4350');
      M.dias.forEach((d, i) => {
        const cx = gridX + i * 12 * colW;
        T(cx + 6 * colW, yH1 + 4.2, d.texto, st.fsDia, true, st.diaColor, 'middle');
        for (let h = 1; h <= 12; h++) T(cx + (h - 0.5) * colW, yH2 + 3.2, String(h * 2), st.fsHora, false, st.horaColor, 'middle');
      });

      // ---- cuerpo
      // pasada 1: fondos (zebra / fila de trabajo) y, en B y C, la rejilla vertical DEBAJO de las barras
      { let yy = yBase; pagina.bloques.forEach((b) => b.filas.forEach((r, ir) => {
          if (st.zebra && r.tipo === 'sub' && (ir % 2 === 0)) R(marg + labW, yy, PW - marg - labW - marg, r.h, st.zebra);
          if (st.otFill && r.tipo === 'ot') R(marg + labW, yy, PW - marg - labW - marg, r.h, st.otFill);
          yy += r.h; }));
        if (st.id !== 'A') for (let c = 0; c <= nCol; c++) { const gx = gridX + c * colW, esDia = c % 12 === 0; if (esDia) L(gx, yH1, gx, yy, st.lineaDia[0], st.lineaDia[1]); else if (st.id === 'C') { if (c % 6 === 0) L(gx, yH2, gx, yy, st.lineaHora[0], st.lineaHora[1]); } else L(gx, yH2, gx, yy, st.lineaHora[0], st.lineaHora[1]); } }
      let y = yBase; const grupoSpans = [];
      pagina.bloques.forEach((b, ib) => {
        const y0 = y;
        b.filas.forEach((r, ir) => {
          // texto
          const esTitulo = r.tipo === 'ot' || r.tipo === 'res';
          const tx = marg + labW + 1.1 + (r.tipo === 'sub' ? st.sangria : 0);
          const nSup = (r.supL || []).length, hTxt = r.lineas.length * lineH + nSup * supH;
          const ty0 = y + padV + st.fsTxt * 0.92 + ((r.h - hTxt - padV * 2) / 2);
          r.lineas.forEach((ln, k) => T(tx, ty0 + k * lineH, ln, esTitulo ? st.fsOt : st.fsTxt, esTitulo, st.id === 'C' && esTitulo ? '#1C2733' : '#000'));
          (r.supL || []).forEach((ln, k) => {
            const by = ty0 + r.lineas.length * lineH + k * supH + 1.35;   // línea base del texto del supervisor
            let cx = tx;
            ln.forEach((sg) => {
              if (sg.tipo === 'etq') {
                const e = ETQ[sg.t], w = medir(sg.txt, FS_ETQ, true, st.fam) + 1.7;
                out.push(`<rect x="${f(cx)}" y="${f(by - 1.85)}" width="${f(w)}" height="2.45" rx=".7" fill="${e.fill}"/>`);
                T(cx + w / 2, by - 0.02, sg.txt, FS_ETQ, true, e.color, 'middle');
                cx += w + 0.8;
              } else { T(cx, by, sg.nom || sg.txt, FS_NOM, true, '#1C2733'); cx += medir(sg.txt, FS_NOM, true, st.fam) + 2.2; }
            });
          });
          // barra
          if (r.tipo === 'res') {
            // todos los pasos del trabajo en una sola línea; terceros en una franja fina debajo
            const hayT = r.terc && r.terc.length, pad = st.barraPad || .6;
            const bh = hayT ? (r.h - pad * 2) * .64 : r.h - pad * 2;
            r.subs.forEach((s) => {
              const a = Math.max(new Date(s.inicio).getTime(), M.t0), z = Math.min(new Date(s.fin).getTime(), M.t0 + M.nDias * 864e5);
              if (z <= a) return;
              const bx = x(a), bw = Math.max(x(z) - bx, .6);
              out.push(`<rect x="${f(bx)}" y="${f(y + pad)}" width="${f(bw)}" height="${f(bh)}" fill="${color(r.ot.cuadrilla)}" rx="${st.barraRad || 0}" stroke="#fff" stroke-width=".22"><title>${esc(s.nombre)}</title></rect>`);
            });
            if (hayT) r.terc.forEach((c) => {
              const a = Math.max(new Date(c.inicio).getTime(), M.t0), z = Math.min(new Date(c.fin).getTime(), M.t0 + M.nDias * 864e5);
              if (z <= a) return;
              const bx = x(a), bw = Math.max(x(z) - bx, .6), ty = y + pad + bh + .7, th = r.h - pad - ty + y;
              out.push(`<rect x="${f(bx)}" y="${f(ty)}" width="${f(bw)}" height="${f(Math.max(th, .8))}" fill="none" stroke="${st.tercColor}" stroke-width=".18" stroke-dasharray=".8 .6" rx=".4"><title>${esc(c.nombre)}</title></rect>`);
            });
          } else if (r.tipo === 'sub') {
            const a = Math.max(new Date(r.sub.inicio).getTime(), M.t0), z = Math.min(new Date(r.sub.fin).getTime(), M.t0 + M.nDias * 864e5);
            if (z > a) {
              const bx = x(a), bw = Math.max(x(z) - bx, .6), by = y + st.barraPad, bh = r.h - st.barraPad * 2;
              out.push(`<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" fill="${color(r.ot.cuadrilla)}"${st.barraRad ? ` rx="${st.barraRad}"` : ''}${st.barraBorde ? ` stroke="${st.barraBorde}" stroke-width=".12"` : ''}/>`);
            }
          } else if (r.terc && r.terc.length) {
            const carriles = []; const orden = r.terc.slice().sort((p, q) => new Date(p.inicio) - new Date(q.inicio));
            orden.forEach((c) => { let k = 0; while (carriles[k] != null && carriles[k] > new Date(c.inicio).getTime()) k++; c._k = k; carriles[k] = new Date(c.fin).getTime(); });
            const nK = Math.max(1, carriles.length);
            orden.forEach((c) => {
              const a = Math.max(new Date(c.inicio).getTime(), M.t0), z = Math.min(new Date(c.fin).getTime(), M.t0 + M.nDias * 864e5);
              if (z <= a) return;
              const pad = st.barraPad || 0.4, hTot = r.h - (r.supL || []).length * supH - pad * 2, bh = hTot / nK - (nK > 1 ? .3 : 0);
              const bx = x(a), bw = Math.max(x(z) - bx, .6), by = y + pad + c._k * (hTot / nK);
              const fill = st.tercRayas ? 'url(#ray)' : st.tercFill;
              out.push(`<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" fill="${fill}"${st.barraRad ? ` rx="${st.barraRad}"` : ''}${st.tercDash ? ` stroke="${st.tercColor}" stroke-width=".18" stroke-dasharray=".8 .6"` : ''}><title>${esc(c.nombre)}</title></rect>`);
              const et = String(c.tag || '');
              if (et && nK === 1 && medir(et, 1.9, true, st.fam) + 1 <= bw) T(bx + bw / 2, by + bh / 2 + .7, et, 1.9, true, st.tercColor, 'middle');
            });
          }
          y += r.h;
          // línea de fila
          L(marg + labW, y, PW - marg, y, st.lineaFila[0], st.lineaFila[1]);
        });
        grupoSpans.push({ area: b.area, y0, y1: y });
        // separador de bloques OT: ya cubierto por la línea de fila
      });
      const yFin = y;

      // ---- rejilla vertical (horas y días) sobre el cuerpo y la cabecera de horas
      if (st.id === 'A') for (let c = 0; c <= nCol; c++) {
        const gx = gridX + c * colW, esDia = c % 12 === 0;
        if (esDia) L(gx, yH1, gx, yFin, st.lineaDia[0], st.lineaDia[1]);
        else L(gx, yH2, gx, yFin, st.lineaHora[0], st.lineaHora[1]);
      }
      // líneas de cabecera
      L(gridX, yH2, PW - marg, yH2, st.lineaDia[0], st.lineaDia[1] * .8);
      L(marg, yBase, PW - marg, yBase, st.lineaDia[0], st.lineaDia[1]);
      L(marg, yH1, PW - marg, yH1, st.lineaDia[0], st.lineaDia[1]);

      // ---- columna izquierda: equipo/área en vertical (se agrupa por área consecutiva)
      const fusion = [];
      grupoSpans.forEach((s) => { const u = fusion[fusion.length - 1]; if (u && u.area === s.area) u.y1 = s.y1; else fusion.push({ ...s }); });
      fusion.forEach((s) => {
        R(marg, s.y0, labW, s.y1 - s.y0, st.etqFill);
        const span = s.y1 - s.y0 - 2; let fs = 3.2;
        while (fs > 1.7 && medir(s.area, fs, true, st.fam) > span) fs -= .1;
        let txt = s.area; while (txt.length > 3 && medir(txt, fs, true, st.fam) > span) txt = txt.slice(0, -1);
        if (txt !== s.area) txt += '…';
        out.push(`<text transform="translate(${f(marg + labW / 2 + fs * .35)},${f((s.y0 + s.y1) / 2)}) rotate(-90)" font-size="${f(fs)}" font-weight="700" fill="${st.etqColor}" text-anchor="middle">${esc(txt)}</text>`);
        L(marg, s.y1, PW - marg, s.y1, st.sepGrupo[0], st.sepGrupo[1]);
        L(marg, s.y0, PW - marg, s.y0, st.sepGrupo[0], st.sepGrupo[1]);
      });
      L(marg + labW, yBase, marg + labW, yFin, st.lineaDia[0], st.lineaDia[1] * .8);
      L(gridX, yBase, gridX, yFin, st.lineaDia[0], st.lineaDia[1]);
      if (st.marco) { out.push(`<rect x="${marg}" y="${yH1}" width="${PW - marg * 2}" height="${f(yFin - yH1)}" fill="none" stroke="${st.marco[0]}" stroke-width="${st.marco[1]}"/>`); }

      // ---- leyenda (cuadrillas + terceros) y pie
      const yLey = PH - marg - st.pieH - st.leyendaH + 2.6;
      let lx = marg;
      if (st.id !== 'A') T(lx, yLey + 1.3, 'Cuadrilla', 2.1, true, st.id === 'C' ? '#6B7885' : '#2E4350');
      else T(lx, yLey + 1.3, 'Cuadrillas:', 2.1, true, '#000');
      lx += st.id === 'A' ? 15 : 13;
      M.cuadrillas.forEach((c) => {
        out.push(`<rect x="${f(lx)}" y="${f(yLey)}" width="4.6" height="2.4" fill="${color(c)}"${st.barraRad ? ` rx="${Math.min(st.barraRad, 1)}"` : ''}/>`);
        T(lx + 5.6, yLey + 1.9, c, 2.2, false, st.id === 'C' ? '#1C2733' : '#000'); lx += 7.2 + medir(c, 2.2, false, st.fam);
      });
      if (M.comps.length) {
        lx += 2;
        out.push(`<rect x="${f(lx)}" y="${f(yLey)}" width="4.6" height="2.4" fill="${st.tercRayas ? 'url(#ray)' : st.tercFill}"${st.tercDash ? ` stroke="${st.tercColor}" stroke-width=".18" stroke-dasharray=".8 .6"` : ''}${st.barraRad ? ` rx="${Math.min(st.barraRad, 1)}"` : ''}/>`);
        T(lx + 5.6, yLey + 1.9, 'Terceros', 2.2, false, st.id === 'C' ? '#1C2733' : '#000');
      }
      if (st.pie) {
        const fch = new Date(); const txt = `Generado el ${p2(fch.getDate())}/${p2(fch.getMonth() + 1)}/${fch.getFullYear()} ${p2(fch.getHours())}:${p2(fch.getMinutes())}`;
        T(marg, PH - marg + 1, txt, 1.9, false, '#8693A0'); T(PW - marg, PH - marg + 1, `Página ${ip + 1} de ${total}`, 1.9, false, '#8693A0', 'end');
      }
      out.push('</svg>');
      return out.join('');
    });
    return svgs.length ? svgs : [`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}"><rect width="${PW}" height="${PH}" fill="#fff"/><text x="10" y="20" font-size="5">Sin actividades para mostrar</text></svg>`];
  }

  // ---------------------------------------------------------------- salidas
  async function cargarLogos() {
    const urls = [window.BRANDING && window.BRANDING.logoURL, window.BRANDING && window.BRANDING.logoDimarzaURL].filter(Boolean);
    const out = [];
    for (const u of urls) {
      try {
        const blob = await (await fetch(u)).blob();
        const data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
        const dim = await new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = ko; im.src = data; });
        out.push({ data, w: dim.w, h: dim.h });
      } catch (e) { /* sin ese logo */ }
    }
    return out;
  }
  async function paginas(modo, supervisores) { const estilo = 'C'; return componer(estilo, { modo, supervisores: !!supervisores, logos: ESTILOS[estilo].banda ? await cargarLogos() : null }); }
  async function aCanvas(svg, pxPorMm) {
    const k = pxPorMm || 8, url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image(); await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('No se pudo dibujar la página')); img.src = url; });
      const c = document.createElement('canvas'); c.width = Math.round(PW * k); c.height = Math.round(PH * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return c;
    } finally { URL.revokeObjectURL(url); }
  }
  const aBlob = (canvas, tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo || 'image/png', q));
  async function aPdf(svgs) {
    const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    for (let i = 0; i < svgs.length; i++) { if (i) doc.addPage('a4', 'landscape'); const c = await aCanvas(svgs[i], 9); doc.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, PW, PH, undefined, 'FAST'); }
    return doc.output('blob');
  }
  window.CoreDistribucion = { ESTILOS, PALETA, componer, paginas, aCanvas, aBlob, aPdf, modelo };
})();
