"""Diagnostic heuristique des noms accessibles statiques et dynamiques.
Ce test ne certifie pas WCAG/RGAA et n'emploie pas un lecteur d'écran.
"""
import asyncio, sys, pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from playwright.async_api import async_playwright
from importlib.machinery import SourceFileLoader
from importlib.util import spec_from_loader, module_from_spec
module=SourceFileLoader('browser52',str(pathlib.Path(__file__).parent/'test-browser-520.py'))
spec=spec_from_loader('browser52',module);m=module_from_spec(spec);module.exec_module(m)

JS="""() => [...document.querySelectorAll('button, input, select, textarea, [role=\"button\"], [role=\"tab\"]')].map((el,i)=>{
let tag=el.tagName.toLowerCase(),id=el.id||'';
if(tag==='input' && el.type==='hidden') return null;
let css=getComputedStyle(el), visible=css.display!=='none' && css.visibility!=='hidden' && el.getClientRects().length>0;
let labelledby=(el.getAttribute('aria-labelledby')||'').split(/\\s+/).map(x=>document.getElementById(x)?.textContent?.trim()||'').join(' ').trim();
let labels=el.labels ? [...el.labels].map(x=>x.textContent.trim()).join(' ').trim():'';
let text=(el.innerText||el.textContent||'').trim();
let explicit=el.getAttribute('aria-label')||labelledby||labels||el.getAttribute('title')||'';
let name=explicit||(tag==='button'||el.getAttribute('role')==='button'||el.getAttribute('role')==='tab'?text:'');
return {tag,id,name:name.substring(0,80),visible,disabled:el.disabled||false,html:el.outerHTML.substring(0,200)};
}).filter(Boolean)"""
async def main():
 async with async_playwright() as pw:
  br=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  p,errs,_=await m.load_page(br,1365,850)
  items=await p.evaluate(JS)
  visible=[x for x in items if x['visible']]
  missing=[x for x in items if not x['name']]
  print('Controles : total',len(items),'visibles',len(visible),'sans nom heuristique (tous)',len(missing))
  for x in missing:print('MANQUANT:',x)
  print('Page errors',errs[:5]); await p.close()
  mobile,errs,_=await m.load_page(br,375,812)
  print('Mobile errors:',errs[:3]);await mobile.close();await br.close()
  # Treat missing name as failure after corrections; invisible controls need additional targeted checks.
  if missing: sys.exit(1)
asyncio.run(main())
