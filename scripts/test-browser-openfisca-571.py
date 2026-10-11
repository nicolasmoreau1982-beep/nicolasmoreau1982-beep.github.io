"""Contrôle visuel de la page 5.7.1 en Chromium, depuis le HTML en mémoire."""
from pathlib import Path
import re
import asyncio
from playwright.async_api import async_playwright
D=Path(__file__).resolve().parents[1]/'dist'
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for w,h in [(1365,850),(375,812)]:
   p=await browser.new_page(viewport={'width':w,'height':h})
   errors=[]
   p.on('pageerror',lambda e:errors.append(str(e)))
   html=(D/'verification-openfisca-571.html').read_text()
   html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',html)
   html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html)
   html=html.replace('</head>','<style>'+ (D/'styles.css').read_text() + (D/'guides.css').read_text()+'</style></head>')
   await p.set_content(html)
   assert 'Fiscalité' in (await p.title()) or 'OpenFisca' in (await p.title())
   assert await p.get_by_role('heading',level=1).count()==1
   assert await p.get_by_text('Run workflow',exact=False).count()>0
   assert not errors,errors
   over=await p.evaluate('document.documentElement.scrollWidth > innerWidth+1')
   assert not over,f'débordement {w}'
   print('CHROMIUM 5.7.1 :',w,'px, page de méthode lisible sans JavaScript, aucun débordement')
   await p.close()
  await browser.close()
asyncio.run(main())
