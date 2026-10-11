/* Catálogo local de paradas. Los documentos quedan bajo paradas/{id}, por lo
   que cada detención conserva separados Gantt, avances, informes, fotos y firmas. */
(function () {
  const KEY = 'paradas.active';
  const ROOT = 'paradas';
  const original = JSON.parse(JSON.stringify(SEED_DATA));
  // Huella de la planificación incluida en la app: si cambia en una versión nueva, la parada piloto se actualiza.
  const hashOf = (o) => { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
  const originalHash = hashOf(original);
  const brand = JSON.parse(JSON.stringify(window.BRANDING || {}));
  const pilotId = PARADA_ID;
  const catalog = { rows: [], current: null, ready: null };
  const safe = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const firestore = () => window.firebase.firestore();
  // Formato de informe incluido por defecto (Centinela / BHP Escondida), definido en index.html.
  const FORMATOS = () => window.FORMATOS_INFORME || {};
  // La parada piloto (Centinela) nunca guardó el campo: se toma como 'centinela'.
  function formatoIdDe(row) { return (row && (row.formato || (row.id === pilotId ? 'centinela' : ''))) || ''; }
  function formatoDe(row) { return FORMATOS()[formatoIdDe(row)] || null; }
  function validId(s) { return /^[a-z0-9][a-z0-9_-]{2,55}$/.test(s); }
  async function load() {
    await window.ParadasLocal.ready();
    const existing = await firestore().collection(ROOT).doc(pilotId).get();
    const prev=existing.data()||{};
    catalog.rows = [{...prev,id:pilotId}];
    const pilot = catalog.rows[0];
    if (!pilot) {
      throw new Error('No se pudo inicializar la parada piloto.');
    }
    if(!pilot.definition||pilot.definitionHash!==originalHash){Object.assign(pilot,{name:original.paradaNombre,brand,definition:original,definitionHash:originalHash,templateUrl:'./assets/plantilla-informe.docx',adapter:'centinela-semiva-v1'}); if(!pilot.formato) pilot.formato='centinela';await firestore().collection(ROOT).doc(pilotId).set(pilot,{merge:true});}
    const otherIds=(await window.ParadasLocal.listParadas()).map(p=>p.id).filter(validId);
    for(const id of otherIds){if(id===pilotId)continue;const doc=await firestore().collection(ROOT).doc(id).get();const x=doc.data()||{};if(x.definition)catalog.rows.push({...x,id});}
    const chosen = localStorage.getItem(KEY) || pilotId;
    catalog.current = catalog.rows.find(x=>x.id===chosen) || pilot;
    localStorage.setItem(KEY,catalog.current.id);
    PARADA_ID = catalog.current.id;
    if (catalog.current.definition) {
      Object.keys(SEED_DATA).forEach(k=>delete SEED_DATA[k]);
      Object.assign(SEED_DATA,JSON.parse(JSON.stringify(catalog.current.definition)));
    }
    const fmt = formatoDe(catalog.current);
    window.BRANDING = fmt ? {...brand,...fmt.brand} : {...brand,...(catalog.current.brand||{})};
    if (fmt) catalog.current.templateUrl = fmt.templateUrl;
    document.title = `CORE Bitácora de Paradas · ${catalog.current.name}`;
    document.addEventListener('click', interceptMenu, true);
  }
  function interceptMenu(e) {
    if (!e.target.closest('#btnMenuMantenciones')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    renderPicker();
  }
  function renderPicker() {
    const backdrop=document.getElementById('mantencionesBackdrop');
    const list=document.getElementById('listaMantenciones');
    list.innerHTML = catalog.rows.map(p=>`<button class="parada-card ${p.id===catalog.current.id?'active':''}" data-parada="${safe(p.id)}"><strong>${safe(p.name)}</strong><span>${safe((p.brand||{}).cliente||'')} · ${safe((p.brand||{}).empresa||'')}</span><small>${p.id===catalog.current.id?'ACTIVA':'Abrir esta parada'}</small></button>${selectorFormato(p)}`).join('')+
      `<div class="parada-import"><h3>Añadir otra parada</h3><p>Importa un paquete .zip con el JSON de actividades (parada.json). Si indica "formato": "bhp" o "centinela" usa la plantilla incluida; si no, lleva su propia plantilla.docx.</p><button class="btn-mini" id="paradaImportar">Importar paquete ZIP</button><input id="paradaZip" type="file" accept=".zip,application/zip" hidden></div>`;
    list.querySelectorAll('[data-parada]').forEach(b=>b.onclick=()=>switchTo(b.dataset.parada));
    list.querySelectorAll('[data-formato-de]').forEach(sel=>sel.onchange=()=>cambiarFormato(sel.dataset.formatoDe,sel.value));
    const input=list.querySelector('#paradaZip');
    list.querySelector('#paradaImportar').onclick=()=>input.click();
    input.onchange=()=>{ if(input.files[0]) importPackage(input.files[0]); };
    backdrop.classList.add('open'); document.getElementById('btnMenuMantenciones')?.setAttribute('aria-expanded','true');
  }
  function selectorFormato(p) {
    const f=FORMATOS(); const ids=Object.keys(f); if(!ids.length) return '';
    const actual=f[formatoIdDe(p)]?formatoIdDe(p):'';
    return `<label class="parada-formato" style="display:block;margin:-4px 0 12px;font-size:12px">Formato de informe: <select data-formato-de="${safe(p.id)}">${actual?'':'<option value="" selected>Personalizado (plantilla propia)</option>'}${ids.map(k=>`<option value="${k}" ${k===actual?'selected':''}>${safe(f[k].nombre)}</option>`).join('')}</select></label>`;
  }
  async function cambiarFormato(id,formato) {
    const f=FORMATOS()[formato]; const row=catalog.rows.find(x=>x.id===id); if(!f||!row) return;
    if(!confirm('Cambiar el formato de informe de esta parada a "'+f.nombre+'"?\n\nSolo cambia la plantilla y los datos de marca del Word que se genera; tus avances e informes no se modifican.')) { renderPicker(); return; }
    row.formato=formato; row.brand=JSON.parse(JSON.stringify(f.brand)); row.templateUrl=f.templateUrl;
    await firestore().collection(ROOT).doc(id).set({formato:formato,brand:row.brand,templateUrl:row.templateUrl},{merge:true});
    await window.ParadasLocal.flush?.();
    if(id===catalog.current.id) location.reload(); else renderPicker();
  }
  async function switchTo(id) {
    if(id===catalog.current.id)return;
    if(window.subidasInformeEnCurso>0) { alert('Espera a que termine la carga de archivos antes de cambiar de parada.'); return; }
    await window.ParadasLocal.flush?.();
    localStorage.setItem(KEY,id); location.reload();
  }
  async function importPackage(file) {
    try {
      if(file.size>60*1024*1024) throw Error('El paquete supera el límite de 60 MB.');
      const zip=await JSZip.loadAsync(await file.arrayBuffer());
      if(!zip.file('parada.json')) throw Error('El ZIP debe incluir parada.json.');
      const p=JSON.parse(await zip.file('parada.json').async('string'));
      const fmtPaquete=FORMATOS()[p.formato||''];
      if(p.formato&&!fmtPaquete) throw Error('El paquete pide el formato de informe "'+p.formato+'", que esta versión no incluye.');
      if(p.format!=='paradas-bradson-package'||p.version!==1||!validId(p.id)||!p.definition||(!p.brand&&!fmtPaquete)) throw Error('Paquete no válido. Comprueba formato, versión e identificador.');
      if(!p.brand) p.brand={};
      if(catalog.rows.some(x=>x.id===p.id)) throw Error('Ya existe una parada con ese identificador.');
      if(!Array.isArray(p.definition.turnos)||!Array.isArray(p.definition.ots)||!p.definition.paradaNombre) throw Error('El cronograma no incluye actividades y fechas válidas.');
      const d=p.definition;
      if(!Array.isArray(d.turnoLabels)||d.turnoLabels.length<d.turnos.length-1||d.ots.some(o=>!o||typeof o!=='object'||o.otNum==null||typeof o.descripcion!=='string')) throw Error('El cronograma tiene actividades o turnos incompletos.');
      if(typeof p.brand!=='object'||Array.isArray(p.brand)) throw Error('La marca de la parada no es válida.');
      const template=zip.file('plantilla.docx');
      if(fmtPaquete&&!template) { p.templateUrl=fmtPaquete.templateUrl; p.brand=JSON.parse(JSON.stringify(fmtPaquete.brand)); }
      else {
      if(!template) throw Error('El paquete debe incluir plantilla.docx (o indicar un formato incluido) para exportar informes.');
      const bytes=await template.async('uint8array');
      if(bytes.length<50000||String.fromCharCode(...bytes.slice(0,2))!=='PK') throw Error('La plantilla Word no es válida.');
      const ref=window.firebase.storage().ref(`paradas/${p.id}/plantilla.docx`);
      await ref.put(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
      p.templateUrl=await ref.getDownloadURL();
      }
      const row={id:p.id,name:p.name||p.definition.paradaNombre,brand:p.brand,definition:p.definition,templateUrl:p.templateUrl,formato:(template?undefined:p.formato)||undefined,adapter:p.adapter||'centinela-semiva-v1',createdAt:new Date().toISOString()};
      if(row.formato===undefined) delete row.formato;
      await firestore().collection(ROOT).doc(p.id).set(row,{merge:true});
      catalog.rows.push(row); await switchTo(p.id);
    } catch(e) { alert(e.message||'No se pudo importar el paquete.'); }
  }
  catalog.ready=load().catch(e=>{console.error('No se pudo iniciar el catálogo de paradas',e); catalog.current={id:pilotId,definition:original,brand,name:original.paradaNombre,templateUrl:'./assets/plantilla-informe.docx'};});
  window.ParadasCatalog=catalog;
})();
