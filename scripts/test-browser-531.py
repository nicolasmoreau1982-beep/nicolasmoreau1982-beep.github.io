"""Essai navigateur local 5.7.0, sans réseau ; pas un audit RGAA/Lighthouse certifié."""
import asyncio, pathlib,sys, json
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import importlib.util
spec=importlib.util.spec_from_file_location('base',str(pathlib.Path(__file__).parent/'test-browser-520.py'))
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
from playwright.async_api import async_playwright
DIST=pathlib.Path(__file__).resolve().parent.parent/'dist'
CHECKS='''() => [...document.querySelectorAll('button,input,select,textarea,[role="button"],[role="tab"]')].filter(e=>!(e.tagName==='INPUT'&&e.type==='hidden')).map(e=>{
 const labs=e.labels ? [...e.labels].map(x=>x.textContent?.trim()||'').join(' ') : '';
 const ids=(e.getAttribute('aria-labelledby')||'').split(/\\s+/).map(id=>document.getElementById(id)?.textContent?.trim()||'').join(' ');
 const txt=(e.innerText||e.textContent||'').trim();
 const name=(e.getAttribute('aria-label')||ids||labs||(e.tagName==='BUTTON'?txt:'')||e.getAttribute('title')||'').trim();
 const visible=!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 return {tag:e.tagName,id:e.id||'',visible,named:!!name};
})'''
async def main():
 result={'version':'5.7.0','method':'Chromium in-memory, heuristic control names + keyboard', 'views': []}
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height in [(1365,850),(375,812)]:
   p,errors,_=await base.load_page(browser,width,height)
   await p.add_script_tag(content=(DIST/'site-meta-531.js').read_text())
   assert not errors,errors[:2]
   assert (await p.locator('.current-version-531').inner_text()).endswith('5.7.0')
   assert (await p.locator('.footer-version').inner_text()).startswith('Version 5.7.0')
   assert await p.locator('.hero-transparence-531 a').count()==6
   ctrls=await p.evaluate(CHECKS)
   missing=[x for x in ctrls if not x['named']]
   assert not missing,missing[:10]
   # Accessibilité fonctionnelle des contrôles du glossaire et menu via clavier
   await p.locator('[data-glossary="projection"]').click()
   assert await p.locator('#v52-glossary-dialog').evaluate('(e)=>e.open')
   await p.keyboard.press('Escape')
   assert not await p.locator('#v52-glossary-dialog').evaluate('(e)=>e.open')
   if width==375:
    await p.locator('#mobile-nav-toggle').click()
    assert await p.locator('#mobile-nav-toggle').get_attribute('aria-expanded')=='true'
    await p.keyboard.press('Escape')
    assert await p.locator('#mobile-nav-toggle').get_attribute('aria-expanded')=='false'
   size=await p.evaluate('({viewport:innerWidth, scroll:document.documentElement.scrollWidth})')
   # Tableaux experts peuvent avoir un défilement interne, non toute la page
   assert size['scroll']<=size['viewport']+2,size
   result['views'].append({'width':width,'height':height,'controls':len(ctrls),'visible':sum(x['visible'] for x in ctrls),'missing_names':len(missing),'horizontal_scroll':size['scroll'],'page_errors':errors})
   await p.close()
  await browser.close()
 path=DIST.parent/'audit-navigateur-531.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print('NAVIGATEUR 5.7.0 OK :',result['views'])
asyncio.run(main())
