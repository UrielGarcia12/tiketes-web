(function(){
  var session=null, all=[], q='', cat='';
  window.__initInventory=function(s){ session=s; render(); loadProducts(); };

  async function loadProducts(){
    // RLS filtra por auth.uid(); NO enviamos user_id en el select.
    var r=await sb.from('products')
      .select('id,name,price,cost_price,stock,min_stock,category,unit,brand,barcode,sku,description')
      .order('name',{ascending:true});
    if(r.error){ toast('No pudimos cargar tus productos.'); return; }
    all=r.data||[]; paint();
  }

  function visible(){
    return all.filter(function(p){
      var okq=!q || (p.name+' '+(p.sku||'')+' '+(p.barcode||'')).toLowerCase().indexOf(q)>=0;
      var okc=!cat || p.category===cat;
      return okq && okc;
    });
  }

  function paint(){
    var rows=visible().map(function(p){
      return '<tr data-id="'+p.id+'">'
        +'<td>'+escapeHtml(p.name)+'</td>'
        +'<td>$'+Number(p.price).toFixed(2)+'</td>'
        +'<td>'+(p.cost_price!=null?'$'+Number(p.cost_price).toFixed(2):'—')+'</td>'
        +'<td>'+(p.stock!=null?p.stock:0)+'</td>'
        +'<td>'+escapeHtml(p.category||'otros')+'</td>'
        +'<td>'+escapeHtml(p.sku||'')+'</td>'
        +'<td class="row-actions"><button class="lnk" data-act="edit">Editar</button>'
        +'<button class="lnk danger" data-act="del">Eliminar</button></td></tr>';
    }).join('');
    document.getElementById('tbody').innerHTML = rows ||
      '<tr><td colspan="7" class="empty">Sin productos. Agrega el primero o importa tu Excel.</td></tr>';
  }

  function render(){
    document.getElementById('content').innerHTML=
      '<div class="inv-head">'
      +'<h1>Inventario</h1>'
      +'<div class="inv-actions">'
      +'<button class="btn btn-ghost" id="btnImport">Importar Excel</button>'
      +'<button class="btn btn-primary" id="btnAdd">+ Agregar producto</button></div></div>'
      +'<div class="inv-filters">'
      +'<input id="q" placeholder="Buscar por nombre, SKU o código…">'
      +'<select id="cat"><option value="">Todas las categorías</option>'
      + CATS.map(function(c){return '<option>'+c+'</option>'}).join('') +'</select></div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      +'<th>Nombre</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Categoría</th><th>SKU</th><th></th>'
      +'</tr></thead><tbody id="tbody"></tbody></table></div>';
    document.getElementById('q').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();paint();});
    document.getElementById('cat').addEventListener('change',function(e){cat=e.target.value;paint();});
    document.getElementById('btnAdd').addEventListener('click',function(){openForm(null);});      // Task 5
    document.getElementById('btnImport').addEventListener('click',function(){openImport();});      // Task 7
    document.addEventListener('click',onRowAction);
  }
  function onRowAction(e){
    var b=e.target.closest('button[data-act]'); if(!b) return;
    var id=b.closest('tr').getAttribute('data-id');
    var p=all.find(function(x){return x.id===id});
    if(b.getAttribute('data-act')==='edit') openForm(p);       // Task 5
    if(b.getAttribute('data-act')==='del')  confirmDelete(p);  // Task 6
  }
  function toast(t){ /* banner no bloqueante simple */ var d=document.getElementById('toast'); if(!d){d=document.createElement('div');d.id='toast';d.className='toast';document.body.appendChild(d);} d.textContent=t; d.classList.add('on'); setTimeout(function(){d.classList.remove('on')},3000); }

  // ── Task 5: alta / edición de producto ──────────────────────────
  function openForm(product){
    var isEdit = !!product;
    var wrap=document.createElement('div');
    wrap.className='modal';
    // Markup 100% estático (sin datos del producto interpolados) — se evita XSS.
    wrap.innerHTML =
      '<div class="modal-card">'
      +'<h2>'+(isEdit?'Editar producto':'Agregar producto')+'</h2>'
      +'<form id="prodForm">'
      +'<div class="form-grid">'
      +'<div class="field full"><label for="f-name">Nombre *</label><input id="f-name" type="text" maxlength="120" required></div>'
      +'<div class="field"><label for="f-price">Precio *</label><input id="f-price" type="number" step="0.01" min="0" required></div>'
      +'<div class="field"><label for="f-cost">Costo</label><input id="f-cost" type="number" step="0.01" min="0"></div>'
      +'<div class="field"><label for="f-stock">Stock</label><input id="f-stock" type="number" step="1"></div>'
      +'<div class="field"><label for="f-minstock">Stock mínimo</label><input id="f-minstock" type="number" step="1"></div>'
      +'<div class="field"><label for="f-cat">Categoría</label><select id="f-cat">'
        + CATS.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('') +'</select></div>'
      +'<div class="field"><label for="f-unit">Unidad</label><input id="f-unit" type="text" maxlength="20"></div>'
      +'<div class="field"><label for="f-brand">Marca</label><input id="f-brand" type="text" maxlength="80"></div>'
      +'<div class="field"><label for="f-barcode">Código de barras</label><input id="f-barcode" type="text" maxlength="64"></div>'
      +'<div class="field"><label for="f-sku">SKU</label><input id="f-sku" type="text" maxlength="64"></div>'
      +'</div>'
      +'<div class="field"><label for="f-desc">Descripción</label><textarea id="f-desc" rows="3" maxlength="500"></textarea></div>'
      +'<div id="formErr" class="form-err" hidden></div>'
      +'<div class="modal-actions">'
      +'<button type="button" class="btn btn-ghost" id="btnCancel">Cancelar</button>'
      +'<button type="submit" class="btn btn-primary" id="btnSave">Guardar</button>'
      +'</div>'
      +'</form></div>';
    document.body.appendChild(wrap);

    // Precarga de valores: SIEMPRE vía la propiedad .value, nunca vía innerHTML/texto — evita XSS.
    if(isEdit){
      wrap.querySelector('#f-name').value = product.name || '';
      wrap.querySelector('#f-price').value = product.price!=null ? product.price : '';
      wrap.querySelector('#f-cost').value = product.cost_price!=null ? product.cost_price : '';
      wrap.querySelector('#f-stock').value = product.stock!=null ? product.stock : '';
      wrap.querySelector('#f-minstock').value = product.min_stock!=null ? product.min_stock : '';
      wrap.querySelector('#f-cat').value = product.category || 'otros';
      wrap.querySelector('#f-unit').value = product.unit || 'pza';
      wrap.querySelector('#f-brand').value = product.brand || '';
      wrap.querySelector('#f-barcode').value = product.barcode || '';
      wrap.querySelector('#f-sku').value = product.sku || '';
      wrap.querySelector('#f-desc').value = product.description || '';
    } else {
      wrap.querySelector('#f-unit').value = 'pza';
      wrap.querySelector('#f-cat').value = 'otros';
    }

    function close(){ wrap.remove(); }
    wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
    wrap.querySelector('#btnCancel').addEventListener('click', close);
    wrap.querySelector('#prodForm').addEventListener('submit', async function(e){
      e.preventDefault();
      var errEl = wrap.querySelector('#formErr');
      errEl.hidden = true;
      var saveBtn = wrap.querySelector('#btnSave');
      var form = {
        name: wrap.querySelector('#f-name').value.trim(),
        price: parseFloat(wrap.querySelector('#f-price').value),
        cost_price: wrap.querySelector('#f-cost').value!=='' ? parseFloat(wrap.querySelector('#f-cost').value) : null,
        stock: wrap.querySelector('#f-stock').value!=='' ? parseInt(wrap.querySelector('#f-stock').value,10) : 0,
        min_stock: wrap.querySelector('#f-minstock').value!=='' ? parseInt(wrap.querySelector('#f-minstock').value,10) : 0,
        category: wrap.querySelector('#f-cat').value || 'otros',
        unit: wrap.querySelector('#f-unit').value.trim() || 'pza',
        brand: wrap.querySelector('#f-brand').value.trim() || null,
        barcode: wrap.querySelector('#f-barcode').value.trim() || null,
        sku: wrap.querySelector('#f-sku').value.trim() || null,
        description: wrap.querySelector('#f-desc').value.trim() || null
      };
      saveBtn.disabled = true;
      var res = await saveProduct(isEdit ? product.id : null, form);
      saveBtn.disabled = false;
      if(res.error){ errEl.textContent = res.error; errEl.hidden = false; return; }
      if(res.limit){ close(); openLimitModal(res.limit); return; }
      close();
      toast(isEdit ? 'Producto actualizado.' : 'Producto agregado.');
      loadProducts();
    });
  }

  function openLimitModal(info){
    var wrap=document.createElement('div');
    wrap.className='modal';
    wrap.innerHTML =
      '<div class="modal-card">'
      +'<h2>Llegaste al límite de tu plan</h2>'
      +'<p class="modal-text"></p>'
      +'<div class="modal-actions">'
      +'<button type="button" class="btn btn-ghost" id="btnClose">Cerrar</button>'
      +'<a class="btn btn-primary" id="btnUpgrade" href="../planes.html">Ver planes</a>'
      +'</div></div>';
    document.body.appendChild(wrap);
    var planName = PLAN_NAME[info.plan] || info.plan;
    // Texto vía .textContent (no innerHTML) — info.plan/limit vienen del mensaje de error de Postgres.
    wrap.querySelector('.modal-text').textContent =
      'Tu plan '+planName+' permite hasta '+info.limit+' productos. Actualiza tu plan para seguir agregando.';
    function close(){ wrap.remove(); }
    wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
    wrap.querySelector('#btnClose').addEventListener('click', close);
  }

  async function saveProduct(id, form){
    // form: {name, price, cost_price, stock, min_stock, category, unit, brand, barcode, sku, description}
    if(!form.name || !(form.price>0)){ return {error:'Nombre y precio (mayor a 0) son obligatorios.'}; }
    var COLOR={abarrotes:['#FFF7E6','#A07300'],bebidas:['#E6F0FF','#1E5BB8'],lacteos:['#DCFCE7','#137333'],snacks:['#FFE6E6','#B8252B'],panaderia:['#FFF3E0','#A0522D'],dulces:['#FFE9F2','#9D174D'],limpieza:['#E6FBFF','#0E7A9E'],cuidado:['#EAFCE8','#1F7D2A'],mascotas:['#FFEDE0','#9C4A1C'],galletas:['#F2EEFF','#4524D6'],papas:['#FEF3C7','#7A5500'],otros:['#EEEEF5','#3F3F58']};
    var c=COLOR[form.category]||COLOR.otros;
    var row=Object.assign({}, form, {
      sku: form.sku || form.barcode || null,
      thumb: (form.name.charAt(0)||'📦').toUpperCase(), color:c[0], text_color:c[1]
    });
    var r;
    if(id){
      r = await sb.from('products').update(row).eq('id', id);   // RLS: solo si es tuyo
    } else {
      // La tabla products NO tiene default auth.uid() para user_id (confirmado con prueba de inserción):
      // hay que asignarlo explícitamente o el insert cae fuera de la policy / RLS.
      row.user_id = session.user.id;
      r = await sb.from('products').insert(row);
    }
    if(r.error){
      var m=r.error.message||'';
      if(m.indexOf('PRODUCT_LIMIT_REACHED')>=0){
        var parts=m.split('PRODUCT_LIMIT_REACHED:')[1].split(':');
        return {limit:{plan:parts[0], limit:parseInt(parts[1],10)}};
      }
      return {error:'No se pudo guardar. Intenta de nuevo.'};
    }
    return {};
  }

  // ── Task 6: eliminar producto (con confirmación) ────────────────
  function confirmDelete(p){
    var wrap=document.createElement('div');
    wrap.className='modal';
    // Markup estático + nombre del producto escapado — se evita XSS.
    wrap.innerHTML =
      '<div class="modal-card">'
      +'<h2>Eliminar producto</h2>'
      +'<p class="modal-text">¿Eliminar &quot;'+escapeHtml(p.name)+'&quot;? Esta acción no se puede deshacer.</p>'
      +'<div class="modal-actions">'
      +'<button type="button" class="btn btn-ghost" id="btnCancelDel">Cancelar</button>'
      +'<button type="button" class="btn btn-danger" id="btnConfirmDel">Eliminar</button>'
      +'</div></div>';
    document.body.appendChild(wrap);

    function close(){ wrap.remove(); }
    wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
    wrap.querySelector('#btnCancelDel').addEventListener('click', close);
    wrap.querySelector('#btnConfirmDel').addEventListener('click', function(){
      var delBtn = wrap.querySelector('#btnConfirmDel');
      delBtn.disabled = true;
      sb.from('products').delete().eq('id', p.id).then(function(r){   // RLS: solo si es tuyo
        if(r.error){ toast('No se pudo eliminar.'); delBtn.disabled = false; return; }
        close();
        toast('Producto eliminado.');
        loadProducts();
      });
    });
  }

  // Se exponen para tasks siguientes (mismo IIFE en el archivo final):
  window.__inv={ loadProducts:loadProducts, all:function(){return all}, toast:toast };
})();
