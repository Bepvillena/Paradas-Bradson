/* Ajustes del documento en pantalla sobre la plantilla Word real; el Word descargado sigue editable. */
(function(){
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function signatureCell(root) {
    const tables=Array.from(root.querySelectorAll('table')).filter(t=>/ENCARGADO/i.test(t.innerText||t.textContent||''));
    for(const t of tables.reverse()) {
      const row=Array.from(t.querySelectorAll('tr')).find(r=>/FIRMA/i.test(r.innerText||r.textContent||''));
      if(!row)continue;
      // Fila FIRMA: [etiqueta, ELABORADO POR, REVISADO POR, VALIDADO POR]. La firma
      // propia del informe va en la primera columna de valores (Supervisor Operativo,
      // el encargado que elabora); las otras dos ya traen sus firmas fijas.
      const cells=row.querySelectorAll('td,th'); if(cells.length>1)return cells[1];
    }
    return null;
  }
  function postprocess(root,informe) {
    const cell=signatureCell(root); if(!cell)return;
    cell.querySelectorAll('.doc-firma-control').forEach(n=>n.remove());
    const btn=document.createElement('button'); btn.type='button'; btn.className='doc-firma-control';
    btn.setAttribute('aria-label',informe.encargadoFirmaUrl?'Cambiar firma':'Añadir firma');
    if(informe.encargadoFirmaUrl){const img=document.createElement('img');img.src=informe.encargadoFirmaUrl;img.alt='Firma del encargado';btn.append(img);}
    else btn.textContent='＋ Añadir firma';
    btn.onclick=()=>selectSignature(informe);cell.append(btn);
  }
  async function selectSignature(informe) {
    const file=await elegirArchivoEditor('image/*'); if(!file)return;
    showToast('Guardando firma…');
    const url=await guardarFirmaLocal(file);
    await guardarCampoInformeActivo('encargadoFirmaUrl',url);
    await refrescarVistaInteractiva();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const back=document.getElementById('mantencionesBackdrop');
    back?.addEventListener('click',e=>{if(e.target===back){back.classList.remove('open');document.getElementById('btnMenuMantenciones')?.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&back?.classList.contains('open')){back.classList.remove('open');document.getElementById('btnMenuMantenciones')?.setAttribute('aria-expanded','false');}});
  });
  window.DocumentEditor={postprocess,selectSignature};
})();

