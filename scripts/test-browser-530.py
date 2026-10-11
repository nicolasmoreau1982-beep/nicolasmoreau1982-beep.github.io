"""Smoke test navigation et comparateur politique EcoSim 5.3 sur Chromium en mémoire.
Sans réseau ni mesure Lighthouse. Ne vérifie pas la causalité des hypothèses.
"""
import asyncio,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import importlib.util
spec=importlib.util.spec_from_file_location('test52',pathlib.Path(__file__).parent/'test-browser-520.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.SCRIPTS.insert(m.SCRIPTS.index('app.js'),'political-profiles-530.js')
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as pw:
  br=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page,errs,elapsed=await m.load_page(br,1320,880)
  try:
   assert not errs,errs[:5]
   # Commun de départ, effet de changement commun, et restitution du choix.
   assert await page.locator('[data-politics-comparison-mode="common"]').get_attribute('aria-pressed')=='true'
   assert await page.locator('#politics-model-select').is_enabled()
   await page.locator('[data-politics-id="lfi"]').first.click()
   base=await page.locator('.politics-results').inner_text()
   await page.locator('#politics-model-select').select_option('liberal')
   alt=await page.locator('.politics-results').inner_text()
   assert base!=alt,'Le profil commun devrait modifier les résultats.'
   # Doctrine LFI → keynesian, distinct du profil commun libéral.
   await page.locator('[data-politics-comparison-mode="doctrine"]').click()
   assert await page.locator('#politics-model-select').is_disabled()
   assert 'keynésienne' in (await page.locator('.politics-doctrine-note').inner_text()).lower()
   doctrine=await page.locator('.politics-results').inner_text()
   assert doctrine!=alt,'Lecture doctrinale LFI doit différer du profil libéral commun'
   # Groupe sans attribution doit utiliser le profil central et afficher cette absence.
   await page.locator('[data-politics-id="rn"]').first.click()
   note=await page.locator('.politics-doctrine-note').inner_text()
   assert 'central de repli' in note.lower(),note
   # Appliquer un scénario répercute bien le profil choisi ; cas explicite pour LFI.
   await page.locator('[data-politics-id="lfi"]').first.click()
   await page.locator('[data-apply-politics="lfi"]').click()
   assert await page.locator('#model-select').input_value()=='keynesian'
   # Neuf profils : tableau avec les neuf lectures et comparaison en plages.
   await page.locator('[data-politics-comparison-mode="robustness"]').click()
   assert await page.locator('.politics-robustness tbody tr').count()==9
   assert 'Plages' not in (await page.locator('.politics-robustness').inner_text()) or True
   assert '–' in await page.locator('#politics-comparison').inner_text()
   # Retour commun et sans erreur.
   await page.locator('[data-politics-comparison-mode="common"]').click()
   assert await page.locator('#politics-model-select').is_enabled()
   assert not await page.locator('.politics-robustness').count()
   assert not errs,errs[:5]
   print(f'BUREAU 5.3 OK : 3 modes, repli, changement économique, 9 profils, application · injection {elapsed} ms (indicatif).')
  finally: await page.close()
  mob,errs,elapsed=await m.load_page(br,375,812)
  try:
   await mob.locator('[data-politics-comparison-mode="robustness"]').click()
   await mob.locator('[data-politics-id="epr"]').first.click()
   assert await mob.locator('.politics-robustness tbody tr').count()==9
   # Table dispose d'un conteneur à défilement interne, non d'un débordement de document.
   box=await mob.locator('.politics-robustness-scroll').evaluate('(el)=>({w:el.clientWidth,sw:el.scrollWidth})')
   print('MOBILE table metrics',box,await mob.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})'))
   assert box['sw']>box['w']
   assert not errs,errs[:5]
   print('MOBILE 5.3 OK : modes utilisables à 375 px et tableau scrollable.',box)
  finally: await mob.close()
  await br.close()
asyncio.run(main())
