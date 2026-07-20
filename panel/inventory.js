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

  // Se exponen para tasks siguientes (mismo IIFE en el archivo final):
  window.__inv={ loadProducts:loadProducts, all:function(){return all}, toast:toast };
})();
