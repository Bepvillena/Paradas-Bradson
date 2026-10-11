// Datos de demostración para revisar las pantallas de CORE en el navegador (NO forma parte del programa).
// Se inyecta con una etiqueta <script> en la app abierta. window.coreDemo.avances() carga avances y bitácora;
// window.coreDemo.whatsapp() simula elegir un chat exportado (.zip con fotos).
window.coreDemo = {
  async avances() {
    const C = window.CoreCalculo, T = SEED_DATA.turnos, pl = allOts().filter((o) => o.tipo === 'Planificado');
    const factor = (o, i) => [1.05, 0.85, 0.45, 0.95, 0.6, 1, 0.3, 0.9][(String(o.otNum).split('').reduce((a, b) => a + +b, 0) + i) % 8];
    for (const t of [1, 2, 3]) for (const [k, o] of pl.entries()) {
      if ((k + t) % 7 === 0) continue;
      const fin = C.turnoFin(T, t);
      for (const s of (o.subactividades && o.subactividades.length ? o.subactividades : [null])) {
        const plan = s ? C.planPctOt({ subactividades: [s] }, fin) : C.planPctOt(o, fin);
        const v = Math.max(0, Math.min(1, Math.round(plan * factor(o, t) * 20) / 20));
        if (s) await saveSubAvance(o.otNum, s.nombre, t, v); else await saveOtAvance(o.otNum, t, v);
      }
    }
    await emergManualCollection().add({ area: 'Celdas de Flotación', nombre: 'Fuga en brida de línea de relave', hhEstimadas: 12, fechaDeteccion: '2026-08-12T22:00:00' });
    for (const [i, o] of pl.slice(0, 6).entries()) {
      await bitacoraCollection().add({ otNum: o.otNum, otDescripcion: o.descripcion, area: o.area, titulo: 'OT ' + o.otNum + ' — ' + o.descripcion, fecha: '2026-08-12', turnoTipo: 'Día', turnoIdx: 1, bullets: ['Se retiraron placas desgastadas', 'Se limpió y preparó superficie'], fotos: [], createdAt: Date.now() + i });
    }
    return 'ok';
  },
  async whatsapp() {
    const ots = allOts().filter((o) => o.tipo === 'Planificado'), a = ots[0], b = ots[1], c3 = ots[2];
    const tag = (o) => ((o.descripcion.match(/\b\d{2,4}[A-Za-z]{1,3}\d{2,4}\b/) || [''])[0]);
    const lines = [
      '12/8/26 7:58 a. m. - Los mensajes y las llamadas están cifrados de extremo a extremo.',
      '12/8/26 8:15 a. m. - Víctor Arosquipa: Buenos días',
      `12/8/26 8:40 a. m. - Víctor Arosquipa: OT ${a.otNum} se inició el trabajo, retiro de placas`, '- se limpió la zona',
      '12/8/26 8:41 a. m. - Víctor Arosquipa: IMG-20260812-WA0001.jpg (archivo adjunto)', 'Placas retiradas',
      `12/8/26 9:30 a. m. - Evans Paredes: avance en ${tag(b) || b.otNum} instalación de lifters 30%`,
      '12/8/26 9:31 a. m. - Evans Paredes: IMG-20260812-WA0002.jpg (archivo adjunto)',
      '12/8/26 9:50 a. m. - Evans Paredes: ok',
      `12/8/26 9:10 p. m. - Evans Paredes: ${tag(c3) || c3.otNum} se soldó la base`,
      '13/8/26 12:20 a. m. - Evans Paredes: IMG-20260813-WA0003.jpg (archivo adjunto)',
      '20/9/26 10:00 a. m. - Evans Paredes: mensaje fuera de fechas'];
    const zip = new JSZip(); zip.file('_chat.txt', lines.join('\n'));
    const img = (txt, col) => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; const g = cv.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 400, 300); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText(txt, 30, 160); return new Promise((r) => cv.toBlob(r, 'image/jpeg', .8)); };
    zip.file('IMG-20260812-WA0001.jpg', await img('placas', '#2a6')); zip.file('IMG-20260812-WA0002.jpg', await img('lifters', '#a62')); zip.file('IMG-20260813-WA0003.jpg', await img('soldadura', '#26a'));
    const file = new File([await zip.generateAsync({ type: 'blob' })], 'Chat de WhatsApp con Supervisores.zip', { type: 'application/zip' });
    document.querySelector('#workspaceNav [data-route="control"]').click(); await new Promise((r) => setTimeout(r, 300));
    CoreUI.S.tab = 'whatsapp'; CoreUI.render();
    const dt = new DataTransfer(); dt.items.add(file); const inp = document.getElementById('coreWaArchivo'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 1500));
    return document.querySelectorAll('.core-wa-msg').length + ' mensajes en pantalla';
  },
};
