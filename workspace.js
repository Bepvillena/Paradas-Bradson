/* Paradas workspace v2 — navigation and accessible views over the existing data engine.
   No build step, no remote fonts, no external dependencies. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const html = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    activity: '<path d="M9 6h12M9 12h12M9 18h12M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
    chart: '<path d="M3 3v18h18M7 16l4-5 4 2 5-8"/>',
    report: '<path d="M14 2H5v20h14V7zM14 2v5h5M8 12h8M8 16h6"/>',
    folder: '<path d="M3 7V4h6l3 3h9v13H3z"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  };
  const icon = (name, cls='') => `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.activity}</svg>`;
  const routes = [['inicio','home','Resumen'],['avance','activity','Actividades'],['curva','chart','Curva S'],['informes','report','Informes'],['recursos','folder','Recursos']];
  let ready = false, query = '', area = '', status = '', mode = 'list', sort = 'area';
  let lastFocus = null, backupBusy = false, storageError = false, updateRegistration = null;
  const lastIdx = () => SEED_DATA.turnos.length - 1;
  const progress = (o) => Math.max(0, Math.min(1, otProgressAt(o, lastIdx())));
  function statusOf(o) {
    const value = getOtEstado(o.otNum);
    if (value.startsWith('Cancelada')) return 'cancelled';
    if (value === 'En pausa') return 'paused';
    return progress(o) >= .999 ? 'done' : progress(o) > 0 ? 'running' : 'pending';
  }
  const statusLabels = {pending:'Sin iniciar',running:'En curso',done:'Completada',paused:'En pausa',cancelled:'Cancelada'};
  function dates() {
    const first = new Date(SEED_DATA.turnos[0]), end = new Date(new Date(SEED_DATA.turnos.at(-1)).getTime()+43200000);
    const fmt = (d) => d.toLocaleDateString('es-PE',{day:'2-digit',month:'short'}).replace('.','');
    return {first,end,label:`${fmt(first)} — ${fmt(end)} · ${end.getFullYear()}`};
  }
  function periodLabel() {
    const {first,end}=dates(), now=new Date();
    return now < first ? 'Periodo por iniciar' : now >= end ? 'Periodo finalizado' : 'Parada en curso';
  }
  function filtered() {
    const normalize = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const q = normalize(query);
    const result = otsVisibles().filter((o) => (!area || o.area===area) && (!status || status==='emergent' ? (!status || o.tipo==='Emergente') : statusOf(o)===status) && (!q || normalize([o.otNum,o.descripcion,o.area,o.cuadrilla,getOtSupervisor(o.otNum,'A'),getOtSupervisor(o.otNum,'B'),...(o.subactividades||[]).map(s=>s.nombre)].join(' ')).includes(q)));
    return result.sort((a,b) => sort==='progress' ? progress(a)-progress(b) : sort==='number' ? String(a.otNum).localeCompare(String(b.otNum),'es',{numeric:true}) : String(a.area).localeCompare(String(b.area),'es') || String(a.otNum).localeCompare(String(b.otNum),'es',{numeric:true}));
  }
  function canLeaveDetail() {
    if (!$('sheetBackdrop').classList.contains('open')) return true;
    if ($('btnGuardarComentario').disabled) { showToast('Espera a que termine el guardado.'); return false; }
    const hasDraft=$('comentarioTexto').value.trim() || (typeof comentarioFotoRows!=='undefined' && comentarioFotoRows.some(r=>r.file));
    return !hasDraft || confirm('Tienes comentarios o fotos sin guardar. ¿Salir y descartar ese borrador?');
  }
  function closeDetail() {
    if(!canLeaveDetail())return false;
    closeSheet();
    if (typeof closePolinesSheet==='function') closePolinesSheet();
    document.body.classList.remove('mobile-detalle-activo','polines-abierto','viendo-curva-desde-detalle');
    state.otSeleccionada=null;
    if (lastFocus?.isConnected) lastFocus.focus();
    return true;
  }
  function navigate(page) {
    if(!closeDetail())return;
    if (page==='inicio') openInicioView();
    else {
      if (page==='informes') renderVistaInformes();
      if (page==='recursos') renderResources();
      irAVista(page);
    }
  }
  function openActivity(id) {
    const ot=allOts().find(o=>String(o.otNum)===String(id));
    if (!ot || !canLeaveDetail()) return;
    lastFocus=document.activeElement;
    state.otSeleccionada=ot.otNum;
    if (esCampaniaPolines(ot)) openPolinesSheet(ot.otNum); else abrirDetalleOt(ot.otNum);
    addDialogAccessibility();
    requestAnimationFrame(()=>{
      const panel=document.querySelector('#polinesSheetBackdrop.open .sheet, #sheetBackdrop.open .sheet');
      if(panel){panel.scrollTop=0;panel.querySelector('.ui-close-detail')?.focus();}
    });
  }
  function activityRow(o) {
    const pct=Math.round(progress(o)*100), st=statusOf(o);
    return `<button class="ui-activity" data-open-ot="${html(o.otNum)}" type="button">
      <span class="ui-activity-symbol ${st}">${icon(esCampaniaPolines(o)?'layers':'activity')}</span>
      <span class="ui-activity-name"><span class="ui-ot-code">${o.manual?'ACTIVIDAD EMERGENTE':'OT '+html(o.otNum)}${o.tipo==='Emergente'?'<span class="ui-mini-tag">Emergente</span>':''}</span><strong>${html(o.descripcion)}</strong><span class="ui-activity-meta">${html(o.area)}${o.cuadrilla?' · '+html(cuadrillaLabel(o.cuadrilla)):''}</span></span>
      <span class="ui-status ${st}"><i></i>${statusLabels[st]}</span>
      <span class="ui-progress"><strong>${pct}<small>%</small></strong><span class="ui-meter"><i style="width:${pct}%"></i></span></span>
      ${icon('arrow','ui-row-arrow')}</button>`;
  }
  function renderHome() {
    if(!ready)return;
    const all=allOts(), live=all.filter(o=>statusOf(o)!=='cancelled'), planned=all.filter(o=>o.tipo==='Planificado'&&statusOf(o)!=='cancelled');
    const totalHH=planned.reduce((n,o)=>n+o.pesoPlanHH,0), earned=planned.reduce((n,o)=>n+o.pesoPlanHH*progress(o),0), pct=totalHH?Math.round(100*earned/totalHH):0;
    const done=live.filter(o=>statusOf(o)==='done').length, running=live.filter(o=>statusOf(o)==='running').length;
    const pending=live.filter(o=>statusOf(o)==='pending').length;
    const count = (label,value,note,name,cls='')=>`<div class="ui-stat ${cls}"><div class="ui-stat-top">${label}${icon(name)}</div><strong>${value}</strong><span>${note}</span></div>`;
    const areas=[...new Set(planned.map(o=>o.area))];
    const shortlist=live.filter(o=>statusOf(o)==='running').concat(live.filter(o=>statusOf(o)==='pending')).slice(0,4);
    $('workspaceHome').innerHTML=`
      <section class="ui-page-intro"><div><p class="ui-overline">CONTROL DE MANTENIMIENTO</p><h1>Tu parada, en un vistazo<span>.</span></h1><p>Avances, actividades e informes en un solo lugar.</p></div><button class="ui-button primary" data-route="avance">${icon('plus')}Registrar avance</button></section>
      <section class="ui-project-banner"><div class="ui-project-mark">${icon('layers')}</div><div><span class="ui-overline">${html(window.BRANDING?.cliente||'PARADA')} / ${html(window.BRANDING?.area||'')}</span><h2>${html(SEED_DATA.paradaNombre.replace(/ — FCR&M$/, ''))}</h2><p>${icon('calendar')}${dates().label}<span class="ui-project-divider">/</span>${html(window.BRANDING?.empresa||'')}</p></div><span class="ui-period">${icon('clock')}${periodLabel()}</span></section>
      <section class="ui-stats" aria-label="Resumen de actividades">
        ${count('Actividades',all.length,`${all.filter(o=>o.tipo==='Planificado').length} planificadas · ${all.filter(o=>o.tipo==='Emergente').length} emergentes`,'activity')}
        ${count('Completadas',done,`de ${live.length} actividades vigentes`,'check','success')}
        ${count('En curso',running,'Con avance registrado','clock','teal')}
        ${count('Sin iniciar',pending,'Pendientes de registrar avance','layers')}
      </section>
      <div class="ui-dashboard-grid">
        <section class="ui-panel ui-overview"><div class="ui-panel-heading"><div><h2>Avance general</h2><p>Plan vigente · ponderado por horas-hombre</p></div><button class="ui-text-button" data-route="curva">Ver Curva S ${icon('arrow')}</button></div>
          <div class="ui-overview-body"><div class="ui-ring"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="74" class="ui-ring-track"/><circle cx="90" cy="90" r="74" class="ui-ring-value" stroke-dasharray="${pct*4.6496} 464.96" style="opacity:${pct?1:0}"/></svg><div><strong>${pct}<small>%</small></strong><span>avance registrado</span></div></div>
          <div class="ui-overview-values"><div><i class="teal"></i><span>HH ejecutadas equivalentes</span><strong>${earned.toLocaleString('es-PE',{maximumFractionDigits:1})}</strong></div><div><i></i><span>HH plan vigente</span><strong>${totalHH.toLocaleString('es-PE',{maximumFractionDigits:1})}</strong></div><p>${lastReportedTurno()<0?'Aún no hay porcentajes registrados. Abre una actividad para comenzar.':'Calculado con el último avance registrado de cada actividad.'}</p></div></div>
        </section>
        <section class="ui-panel ui-area-panel"><div class="ui-panel-heading"><div><h2>Avance por área</h2><p>Actividades planificadas vigentes</p></div>${icon('chart')}</div><div class="ui-area-list">${areas.map(a=>{const os=planned.filter(o=>o.area===a), den=os.reduce((n,o)=>n+o.pesoPlanHH,0), v=den?Math.round(os.reduce((n,o)=>n+o.pesoPlanHH*progress(o),0)/den*100):0;return `<button class="ui-area" data-area-shortcut="${html(a)}"><span>${html(a)}<strong>${v}%</strong></span><span class="ui-meter"><i style="width:${v}%"></i></span></button>`}).join('')}</div></section>
      </div>
      <section class="ui-panel ui-next"><div class="ui-panel-heading"><div><h2>Continuar el registro</h2><p>Primero las actividades en curso; después, las pendientes.</p></div><button class="ui-text-button" data-route="avance">Ver todas ${icon('arrow')}</button></div>${shortlist.length?shortlist.map(activityRow).join(''):'<div class="ui-empty">No quedan actividades en curso o sin iniciar. Revisa las pausadas en Actividades.</div>'}</section>
      <div class="ui-bottom-note">${icon('shield')}${respaldoAviso()}<button class="ui-text-button" data-route="recursos">Crear un respaldo ${icon('arrow')}</button></div>`;
  }
  function respaldoAviso() {
    let t=0;try{t=Number(localStorage.getItem('paradas.ultimoRespaldo'))||0;}catch(e){}
    if(!t)return 'Aún no has creado un respaldo. Tus datos solo están en este teléfono.';
    const dias=Math.floor((Date.now()-t)/864e5);
    return dias<=0?'Último respaldo: hoy.':dias===1?'Último respaldo: ayer.':dias<7?`Último respaldo: hace ${dias} días.`:`Último respaldo hace ${dias} días. Conviene crear uno nuevo.`;
  }
  function renderActivities() {
    if(!ready)return;
    const badge=document.querySelector('.ui-nav-count'); if(badge)badge.textContent=allOts().length;
    const rows=filtered();
    $('uiResultCount').textContent=`${rows.length} de ${allOts().length} actividades`;
    $('uiClearFilters').hidden=!(query||area||status||state.filtroSupervisor);
    $('uiActivityList').innerHTML=rows.length?rows.map(activityRow).join(''):`<div class="ui-empty">${icon('search')}<h3>No encontramos actividades</h3><p>Prueba otra OT, nombre o área, o limpia los filtros.</p><button class="ui-button" data-action="clear-filters">Limpiar filtros</button></div>`;
    const allowed=new Set(rows.map(o=>String(o.otNum)));
    document.querySelectorAll('#ganttWrap .gantt-row-full').forEach(el=>el.hidden=!allowed.has(el.dataset.ot));
    document.querySelectorAll('#ganttWrap .gantt-area-header').forEach(el=>{
      let next=el.nextElementSibling, visible=false;
      while(next&&!next.classList.contains('gantt-area-header')){if(next.classList.contains('gantt-row-full')&&!next.hidden)visible=true;next=next.nextElementSibling;}
      el.hidden=!visible;
    });
    const scheduled=rows.filter(o=>o.subactividades?.length && statusOf(o)!=='cancelled').length;
    $('uiTimelineNote').textContent=`El cronograma muestra ${scheduled} actividades con subactividades. Usa Lista para ver también emergentes simples y canceladas.`;
    document.body.dataset.activityMode=mode;
    $('ganttCard').style.setProperty('display', mode==='timeline'?'block':'none', 'important');
    $('listaWrap').style.setProperty('display','none','important');
  }
  function renderResources() {
    if(!ready)return;
    const pets=state.petsDinamicos||[];
    $('uiResourcesDynamic').innerHTML=pets.length?pets.map(p=>`<div class="ui-resource-file">${icon('report')}<span><strong>${html(p.nombre||'PETS')}</strong><small>${(p.otNums||[]).length} actividades asociadas</small></span><button class="ui-text-button" data-pets-ot="${html((p.otNums||[])[0]||'')}">Ver actividad ${icon('arrow')}</button></div>`).join(''):'<div class="ui-resource-placeholder">Los PETS que agregues aparecerán aquí. Los enlaces existentes también están en el detalle de cada actividad.</div>';
    window.ParadasLocal.stats().then(s=>{$('uiStorageCount').textContent=`${s.docs} registros · ${s.files} archivos guardados`}).catch(()=>{$('uiStorageCount').textContent='No se pudo consultar el almacenamiento';});
  }
  function setupShell() {
    const nav=document.createElement('nav');nav.id='workspaceNav';nav.setAttribute('aria-label','Navegación principal');
    nav.innerHTML=`<a class="ui-brand" href="#inicio" data-route="inicio"><img class="ui-brand-logo" src="./icons/icon-192.png" width="44" height="44" alt=""><span>PARADAS<small>BRADSON</small></span></a><div class="ui-nav-label">ESPACIO DE TRABAJO</div><div class="ui-nav-items">${routes.map(([id,i,label])=>`<button type="button" data-route="${id}">${icon(i)}<span>${label}</span>${id==='avance'?'<span class="ui-nav-count">'+allOts().length+'</span>':''}</button>`).join('')}</div><div class="ui-nav-bottom"><div class="ui-local-card">${icon('shield')}<strong>Listo para terreno</strong><p>Trabaja sin conexión.<br>Guarda en tu dispositivo.</p></div><div class="ui-account"><span>PB</span><div>Paradas Bradson<small>Espacio local · v2.0</small></div></div></div>`;
    document.body.prepend(nav);
    const top=document.createElement('div');top.className='ui-topbar';top.innerHTML=`<div class="ui-breadcrumb">Espacio de trabajo <span>/</span><strong id="uiPageName">Resumen</strong></div><div class="ui-topbar-right"><span id="uiSaveStatus" role="status">${icon('shield')}Datos en este dispositivo</span><span class="ui-avatar">PB</span></div>`;
    document.querySelector('.app').prepend(top);
    const paradaButton=$('btnMenuMantenciones');
    if(paradaButton){
      paradaButton.textContent='Paradas ▾';
      paradaButton.setAttribute('aria-label','Seleccionar parada');
      paradaButton.title=window.ParadasCatalog?.current?.name||'Seleccionar parada';
      top.querySelector('.ui-avatar').replaceWith(paradaButton);
    }
    const home=document.createElement('div');home.id='workspaceHome';$('view-inicio').appendChild(home);
    const toolbar=document.createElement('div');toolbar.id='uiActivitiesHeader';toolbar.innerHTML=`<section class="ui-page-intro"><div><p class="ui-overline">REGISTRO EN TERRENO</p><h1>Actividades<span>.</span></h1><p>Busca una orden de trabajo y abre su detalle para registrar el avance.</p></div><button class="ui-button primary" data-action="emergent">${icon('plus')}Nueva emergente</button></section><div class="ui-toolbar"><div class="ui-search">${icon('search')}<input id="uiSearch" type="search" placeholder="Buscar OT, actividad o supervisor…" aria-label="Buscar actividades"></div><label class="ui-filter"><span>Área</span><select id="uiArea"><option value="">Todas las áreas</option>${[...new Set(allOts().map(o=>o.area))].map(a=>`<option>${html(a)}</option>`).join('')}</select></label><label class="ui-filter"><span>Ordenar</span><select id="uiSort"><option value="area">Por área</option><option value="number">Por número OT</option><option value="progress">Menor avance</option></select></label></div><div class="ui-status-filters" aria-label="Filtrar por estado">${[['','Todas'],['pending','Sin iniciar'],['running','En curso'],['done','Completadas'],['paused','En pausa'],['emergent','Emergentes'],['cancelled','Canceladas']].map(([v,l])=>`<button type="button" data-status="${v}" aria-pressed="${!v}">${l}</button>`).join('')}</div><div class="ui-list-heading"><span id="uiResultCount"></span><button id="uiClearFilters" class="ui-text-button" hidden>Limpiar filtros</button><div class="ui-view-switch" aria-label="Presentación de actividades"><button data-mode="list" aria-pressed="true">${icon('activity')}Lista</button><button data-mode="timeline" aria-pressed="false">${icon('calendar')}Cronograma</button></div></div>`;
    $('view-avance').prepend(toolbar);
    const supervisorActions = document.querySelector('.informes-row');
    supervisorActions.classList.add('ui-supervisor-actions');
    toolbar.querySelector('.ui-toolbar').after(supervisorActions);
    const list=document.createElement('section');list.id='uiActivityList';list.className='ui-panel';list.setAttribute('aria-label','Actividades');$('ganttCard').before(list);
    const note=document.createElement('p');note.id='uiTimelineNote';$('ganttCard').after(note);
    const curve=document.createElement('section');curve.className='ui-page-intro';curve.innerHTML='<div><p class="ui-overline">SEGUIMIENTO DE LA PARADA</p><h1>Curva S<span>.</span></h1><p>Compara el avance planificado con el avance registrado por turno.</p></div>';$('view-curva').prepend(curve);
    const resource=document.createElement('section');resource.className='view';resource.id='view-recursos';resource.innerHTML=`<section class="ui-page-intro"><div><p class="ui-overline">DOCUMENTOS Y DATOS</p><h1>Todo a mano<span>.</span></h1><p>Consulta procedimientos y conserva una copia de tu trabajo.</p></div></section><div class="ui-resources-grid"><section class="ui-panel"><div class="ui-panel-heading"><div><h2>Procedimientos de trabajo · PETS</h2><p>Adjunta un PDF y asígnalo a las actividades correspondientes.</p></div>${icon('shield')}</div><div id="uiResourcesDynamic"></div><button class="ui-button" data-action="pets">${icon('plus')}Agregar PETS</button></section><section class="ui-panel"><div class="ui-panel-heading"><div><h2>Respaldo de tus datos</h2><p>Incluye avances, informes, fotos y documentos adjuntos.</p></div>${icon('download')}</div><p id="uiStorageCount">Consultando almacenamiento…</p><div class="ui-backup-actions"><button class="ui-button primary" id="uiExportBackup">${icon('download')}Guardar respaldo</button><button class="ui-button" id="uiImportBackup">${icon('upload')}Restaurar respaldo</button><input id="uiBackupFile" type="file" accept=".zip,application/zip" hidden></div><p id="uiBackupMessage" role="status" class="ui-help">Guarda una copia antes de cambiar de equipo o borrar los datos del navegador. La restauración reemplaza los datos locales.</p></section><section class="ui-panel"><div class="ui-panel-heading"><div><h2>Certificados de aparejos</h2><p>Accede a la carpeta de documentos del proyecto.</p></div>${icon('folder')}</div><button class="ui-button" data-action="certificates" ${typeof DRIVE_CERTIFICADOS_URL!=='undefined'&&DRIVE_CERTIFICADOS_URL?'':'disabled'}>Abrir certificados ${icon('arrow')}</button><p class="ui-help">${typeof DRIVE_CERTIFICADOS_URL!=='undefined'&&DRIVE_CERTIFICADOS_URL?'El enlace externo requiere conexión.':'El proyecto todavía no tiene configurado un enlace a los certificados.'}</p></section><section class="ui-panel"><div class="ui-panel-heading"><div><h2>Cómo registrar un avance</h2><p>Un recorrido simple para comenzar.</p></div>${icon('activity')}</div><ol class="ui-steps"><li><strong>Encuentra la actividad.</strong> Busca por OT, nombre o área.</li><li><strong>Selecciona el turno.</strong> Abre una subactividad e indica el porcentaje.</li><li><strong>Agrega evidencia.</strong> Escribe el comentario, adjunta fotos y pulsa Guardar.</li></ol><p class="ui-help">Los porcentajes se guardan automáticamente. Los comentarios y fotos se guardan con su botón.</p></section></div>`;
    document.querySelector('main').appendChild(resource);
    $('uiSearch').addEventListener('input',e=>{query=e.target.value;renderActivities()});
    $('uiArea').addEventListener('change',e=>{area=e.target.value;renderActivities()});
    $('uiSort').addEventListener('change',e=>{sort=e.target.value;renderActivities()});
    $('uiClearFilters').addEventListener('click',clearFilters);
    $('uiExportBackup').addEventListener('click',exportBackup);
    $('uiImportBackup').addEventListener('click',()=>$('uiBackupFile').click());
    $('uiBackupFile').addEventListener('change',importBackup);
    const help=document.createElement('p');help.className='ui-autosave-help';help.innerHTML=`${icon('shield')}El porcentaje se guarda automáticamente. Usa Guardar para los comentarios y fotos.`;
    $('subListPanel').before(help);
    document.querySelectorAll('.kpi-card .label').forEach(el=>{if(el.textContent==='Crecim. Alcance')el.textContent='Alcance adicional';if(el.textContent==='Var. Neta')el.textContent='Variación de alcance'});
  }
  function clearFilters(){query='';area='';status='';state.filtroSupervisor=null;$('uiSearch').value='';$('uiArea').value='';document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status==='')));renderGanttChart();renderActivities();}
  function improveReportForm() {
    const view=$('view-informe-detalle');
    if(!view||view.dataset.organized)return;
    view.dataset.organized='true';
    const actions=document.createElement('div');actions.className='ui-report-actions';
    $('btnEditarComoDocumento').before(actions);
    ['btnEditarComoDocumento','btnRellenarWordInforme','btnVerActividadesInforme'].forEach(id=>actions.appendChild($(id)));
    const note=document.createElement('p');note.className='ui-help';note.textContent='Completa las secciones que necesites. Los campos se guardan al salir de ellos; los preparativos tienen su propio botón Guardar.';actions.after(note);
    view.querySelectorAll('.informe-form-bloque').forEach((block,i)=>{
      const details=document.createElement('details');details.className='ui-report-section';details.open=i<3;
      const summary=document.createElement('summary');summary.textContent=block.querySelector('.rotulo-mini')?.textContent||'Datos del informe';
      block.before(details);details.append(summary,block);
    });
  }
  function syncNavigation(page) {
    if(!ready)return;
    if(page==='informe-detalle')improveReportForm();
    const active=page==='informe-detalle'?'informes':page;
    document.querySelectorAll('#workspaceNav [data-route]').forEach(el=>{el.classList.toggle('active',el.dataset.route===active);if(el.dataset.route===active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
    $('uiPageName').textContent=routes.find(r=>r[0]===active)?.[2]||'Resumen';
    if(page==='inicio')renderHome();if(page==='avance')renderActivities();if(page==='recursos')renderResources();
    addDialogAccessibility();
    document.title=`${$('uiPageName').textContent} · Paradas Bradson`;
  }
  async function exportBackup() {
    if(backupBusy)return;
    backupBusy=true;const btn=$('uiExportBackup');btn.disabled=true;btn.textContent='Preparando respaldo…';
    try {const blob=await window.ParadasLocal.exportBackup();await descargarBlob(blob,`Paradas-respaldo-${new Date().toISOString().slice(0,10)}.zip`,{compartir:true});try{localStorage.setItem('paradas.ultimoRespaldo',String(Date.now()));}catch(e){}$('uiBackupMessage').textContent='Respaldo generado. En el menú de Android elige Google Drive (u otro destino) para guardarlo fuera del teléfono.';}
    catch(e){$('uiBackupMessage').textContent='No se pudo crear el respaldo: '+e.message;}
    finally{backupBusy=false;btn.disabled=false;btn.innerHTML=icon('download')+'Guardar respaldo'}
  }
  async function importBackup(event) {
    const file=event.target.files[0];event.target.value='';if(!file||backupBusy)return;
    backupBusy=true;$('uiImportBackup').disabled=true;
    try {
      $('uiBackupMessage').textContent='Validando el respaldo…';
      const data=await window.ParadasLocal.readBackup(file);
      if(!confirm(`Este respaldo contiene ${data.docs.length} registros y ${data.files.length} archivos. Reemplazará TODOS los datos locales de esta app. Descarga primero un respaldo si deseas conservarlos. ¿Restaurar?`)){$('uiBackupMessage').textContent='Restauración cancelada. Tus datos no cambiaron.';return;}
      await window.ParadasLocal.restoreBackup(data);$('uiBackupMessage').textContent='Respaldo restaurado. Recargando…';location.reload();
    }catch(e){$('uiBackupMessage').textContent='No se restauraron datos: '+e.message;}
    finally{backupBusy=false;$('uiImportBackup').disabled=false;}
  }
  function addDialogAccessibility() {
    document.querySelectorAll('.sheet-backdrop').forEach(back=>{
      const panel=back.querySelector('.sheet');if(!panel)return;
      panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
      const heading=panel.querySelector('h2');if(heading){if(!heading.id)heading.id=back.id+'Heading';panel.setAttribute('aria-labelledby',heading.id)}
      if(['sheetBackdrop','polinesSheetBackdrop','mantencionesBackdrop'].includes(back.id)&&!panel.querySelector('.ui-close-detail')){
        const btn=document.createElement('button');btn.className='ui-close-detail';btn.type='button';btn.setAttribute('aria-label','Cerrar detalle');btn.innerHTML=icon('close');
        btn.onclick=()=>back.id==='mantencionesBackdrop'?back.classList.remove('open'):closeDetail();panel.prepend(btn);
      }
      panel.querySelectorAll('label:not([for])').forEach(label=>{const control=label.querySelector('input,select,textarea')||label.nextElementSibling;if(control&&['INPUT','SELECT','TEXTAREA'].includes(control.tagName)){if(!control.id)control.id='field-'+Math.random().toString(36).slice(2);label.htmlFor=control.id;}});
    });
    document.querySelectorAll('.gantt-row-full,.sub-row,.informe-card-grande').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button')});
    document.querySelectorAll('button[title]:not([aria-label])').forEach(el=>el.setAttribute('aria-label',el.title));
  }
  document.addEventListener('click',e=>{
    if(!ready)return;
    const route=e.target.closest('[data-route]');if(route){e.preventDefault();navigate(route.dataset.route);return;}
    const ot=e.target.closest('[data-open-ot]');if(ot){openActivity(ot.dataset.openOt);return;}
    const statusBtn=e.target.closest('[data-status]');if(statusBtn){status=statusBtn.dataset.status;document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b===statusBtn)));renderActivities();return;}
    const modeBtn=e.target.closest('[data-mode]');if(modeBtn){mode=modeBtn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===modeBtn)));renderGanttChart();renderActivities();return;}
    const areaBtn=e.target.closest('[data-area-shortcut]');if(areaBtn){clearFilters();area=areaBtn.dataset.areaShortcut;$('uiArea').value=area;navigate('avance');return;}
    const pets=e.target.closest('[data-pets-ot]');if(pets){navigate('avance');openActivity(pets.dataset.petsOt);return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='clear-filters')clearFilters();
    if(action==='emergent')$('btnAddEmerg').click();
    if(action==='pets')abrirModalPets();
    if(action==='certificates'&&DRIVE_CERTIFICADOS_URL)window.open(DRIVE_CERTIFICADOS_URL,'_blank','noopener');
    requestAnimationFrame(addDialogAccessibility);
  });
  document.addEventListener('click',e=>{
    if(e.target.id==='sheetBackdrop' && !canLeaveDetail()){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  window.addEventListener('beforeunload',e=>{
    if(ready && $('sheetBackdrop').classList.contains('open') && ($('comentarioTexto').value.trim() || comentarioFotoRows.some(r=>r.file))){e.preventDefault();e.returnValue='';}
  });
  document.addEventListener('keydown',e=>{
    if(!ready)return;
    if((e.key==='Enter'||e.key===' ')&&e.target.matches('.gantt-row-full,.sub-row,.informe-card-grande')){e.preventDefault();e.target.click();}
    const dialogs=[...document.querySelectorAll('.sheet-backdrop.open')].filter(el=>getComputedStyle(el).display!=='none');
    const dialog=dialogs.at(-1);if(!dialog)return;
    if(e.key==='Escape'){
      if(dialog.id==='sheetBackdrop'||dialog.id==='polinesSheetBackdrop')closeDetail();
      else {const cancel=dialog.querySelector('button[id$="Cancel"],button[id$="Cerrar"],button[id$="Close"],.ui-close-detail');if(cancel)cancel.click();}
    }
    if(e.key==='Tab'){
      const focusable=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
      if(!focusable.length)return;
      if(e.shiftKey&&(document.activeElement===focusable[0]||!dialog.contains(document.activeElement))){e.preventDefault();focusable.at(-1).focus();}
      else if(!e.shiftKey&&(document.activeElement===focusable.at(-1)||!dialog.contains(document.activeElement))){e.preventDefault();focusable[0].focus();}
    }
  });
  window.addEventListener('paradas:navigate',e=>syncNavigation(e.detail));
  window.addEventListener('paradas:resources',()=>{if(ready&&document.body.dataset.page==='recursos')renderResources()});
  window.addEventListener('paradas:render',()=>{if(!ready)return;renderHome();renderActivities();addDialogAccessibility();});
  window.addEventListener('paradas:storage',e=>{
    if(!ready)return;
    storageError=e.detail.status==='error';
    const el=$('uiSaveStatus');el.classList.toggle('error',storageError);
    el.innerHTML=icon(storageError?'close':'shield')+(storageError?'Error al guardar · revisa el espacio':e.detail.status==='saving'?'Guardando…':'Guardado en este dispositivo');
    if(storageError)showToast('No se pudo guardar. Revisa el espacio disponible y vuelve a intentarlo.');
  });
  window.addEventListener('paradas:update',e=>{
    updateRegistration=e.detail;
    if($('uiUpdateBanner'))return;
    const banner=document.createElement('div');banner.id='uiUpdateBanner';banner.innerHTML='<span>Hay una nueva versión. Guarda los comentarios antes de actualizar.</span><button class="ui-button">Actualizar</button>';
    banner.querySelector('button').onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});updateRegistration.waiting?.postMessage({type:'SKIP_WAITING'})};document.querySelector('.ui-topbar').after(banner);
  });
  document.addEventListener('DOMContentLoaded',async()=>{
    await window.ParadasCatalog?.ready;
    setupShell();ready=true;
    $('turnoActualBadge').textContent=periodLabel()+' · '+dates().label;
    document.querySelector('.wp-tag').textContent='PARADA';
    const firstPage=document.body.dataset.page||'inicio';syncNavigation(firstPage);renderActivities();addDialogAccessibility();
    window.ParadasLocal.ready().then(()=>{if(!storageError)$('uiSaveStatus').innerHTML=icon('shield')+'Datos en este dispositivo';}).catch(()=>{$('uiSaveStatus').textContent='Almacenamiento no disponible';});
  });
})();
