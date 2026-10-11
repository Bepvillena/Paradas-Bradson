// Banco de pruebas manual: se inyecta en la app abierta en el navegador y genera
// un informe de prueba con cada formato (window.__gen('bhp'|'cen')) para
// revisarlo en Word. No se incluye en el programa final.
window.__img = (txt, color, w = 800, h = 600) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = 'bold 60px sans-serif'; g.fillText(txt, 40, h / 2);
  return c.toDataURL('image/jpeg', 0.8);
};
window.__gen = async (tag, extra, guardarEn) => {
  const fmtId = tag === 'bhp' ? 'bhp' : 'centinela';
  window.ParadasCatalog.current.templateUrl = window.FORMATOS_INFORME[fmtId].templateUrl;
  window.BRANDING = { ...window.BRANDING, ...window.FORMATOS_INFORME[fmtId].brand };
  const ots = allOts().slice(0, 5);
  state.bitacora = [];
  ots.slice(0, 3).forEach((o, i) => state.bitacora.push({
    id: 'b' + i, otNum: o.otNum, fecha: '2026-08-1' + (2 + i), turnoTipo: i % 2 ? 'Noche' : 'Día', turnoIdx: i + 1,
    bullets: ['Se realizó el trabajo ' + (i + 1), 'Se verificó torque'],
    fotos: [{ url: __img('F' + (2 * i + 1), '#2a6', 800, 600), descripcion: 'Foto A' + i }, { url: __img('F' + (2 * i + 2), '#a62', 600, 800), descripcion: 'Foto B' + i }],
  }));
  state.componentes = [{ id: 'c1', otNum: ots[0].otNum, area: 'X', descripcion: 'Lifter 190x90', cantidad: 4, codigoSAP: '123', createdAt: 1 }];
  const rec = {}; rec[ots[0].otNum] = 'Se recomienda revisar el desgaste cada parada.';
  const inf = Object.assign({
    id: 't1', nombre: 'Prueba', numero: '105', tituloGeneral: 'Restauración de chute móvil prueba', otNums: ots.map((o) => o.otNum),
    encargadoNombre: 'VICTOR AROSQUIPA', objetivoPrincipal: '', herramientasTexto: 'Combo 6 lb — 2\nEslinga 1" x 1 m\t4',
    consumiblesTexto: 'Electrodo 7018\nDisco de corte', conclusiones: {}, recomendaciones: rec,
    portadaFotoUrl: __img('PORTADA', '#456', 1200, 900),
    anexos: [{ categoria: 'diagrama', nombre: 'd.jpg', tipo: 'image/jpeg', url: __img('DIAGRAMA', '#654', 800, 1000), descripcion: 'Vista general' }],
    preparativosTexto: ['Se preparó el área', 'Se instaló andamio'],
    preparativosFotos: [{ url: __img('P1', '#26a', 800, 600), descripcion: 'Prep 1', fecha: '2026-08-11' }, { url: __img('P2', '#62a', 800, 600), descripcion: 'Prep 2', fecha: '2026-08-11' }],
    preparativosFechaIni: '2026-08-11', preparativosFechaFin: '2026-08-11', adminCentinela: '', adminSemiva: '', area: 'Laguna Seca Línea 2',
  }, extra || {});
  const r = await generateInformeWordBlob(inf, { permitirSinComentarios: true });
  const buf = await r.blob.arrayBuffer();
  if (guardarEn === false) return buf.byteLength;
  const res = await fetch('/save/' + tag + '.docx', { method: 'POST', body: buf });
  return (await res.text()) + ' ' + buf.byteLength;
};
