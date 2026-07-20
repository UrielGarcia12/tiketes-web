// Cliente Supabase + guard + helpers, compartido por todas las páginas del panel.
window.SUPABASE_URL='https://wwukfbadzhowpvruumrp.supabase.co';
window.SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dWtmYmFkemhvd3B2cnV1bXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDk1MjksImV4cCI6MjA5NDcyNTUyOX0.2-cPfqjoEkFkzVcWEvIzQHL4SWbvdJnNlCeUSEyzXk8';
var sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON);
var CATS=['abarrotes','bebidas','lacteos','snacks','panaderia','dulces','limpieza','cuidado','mascotas','galletas','papas','otros'];
var PLAN_LIMIT={free:50,essential:500,pro:2500,premium:25000};
var PLAN_NAME={free:'Free',essential:'Essential',pro:'Pro',premium:'Premium'};

// Guard: sin sesión, no se pinta nada.
async function requireSession(){
  var r=await sb.auth.getSession();
  if(!r.data.session){ location.replace('../login.html'); throw new Error('no-session'); }
  return r.data.session;
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
async function signOut(){ try{ await sb.auth.signOut(); }catch(e){} location.replace('../login.html'); }
