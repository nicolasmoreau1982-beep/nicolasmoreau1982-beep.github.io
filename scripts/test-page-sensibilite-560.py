"""Smoke test page statistique sans JS, écran mobile et bureau, pas Lighthouse."""
from pathlib import Path
import asyncio
from playwright.async_api import async_playwright
D=Path(__file__).resolve().parent.parent/'dist'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (1365,375):
   page=await b.new_page(viewport={'width':width,'height':812})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content((D/'sensibilite-globale-560.html').read_text())
   for sheet in ['styles.css','guides.css']:await page.add_style_tag(content=(D/sheet).read_text())
   assert await page.locator('h1').count()==1
   assert await page.locator('section[id^="scenario-"]').count()==3
   assert await page.locator('table').count()==7
   assert not errors,errors
   dims=await page.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth})')
   assert dims['sw']<=dims['w']+2,dims
   await page.close()
   print('SENSIBILITÉ 5.6 PAGE OK :',width,'px')
  await b.close()
asyncio.run(main())
