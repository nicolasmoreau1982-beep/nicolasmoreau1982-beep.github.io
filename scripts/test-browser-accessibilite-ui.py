from playwright.sync_api import sync_playwright
from pathlib import Path
R=Path(__file__).resolve().parent.parent / 'dist'
css=(R/'accessibilite-ui.css').read_text()
js=(R/'accessibilite-ui.js').read_text()
html='''<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fffdf8;} .audit-page{width:360px;} .audit-table-wrap {width:320px;max-width:100%;overflow-x:auto;}table {width:1200px;}</style><style>'''+css+'''</style></head><body><main class="audit-page"><div role="tablist" aria-label="Démonstration"><button role="tab" aria-selected="true" id="tab1">A</button><button role="tab" aria-selected="false" id="tab2">B</button><button role="tab" aria-selected="false" id="tab3">C</button></div><div class="audit-content"><section><h2>Chiffrage</h2><div class="audit-table-wrap"><table><caption>Comparatif fiscal</caption><tr><th>Colonne</th><th>Valeur</th></tr></table></div></section></div></main><script>'''+js+'''</script></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':740}); page.set_content(html)
 wrap=page.locator('.audit-table-wrap')
 assert wrap.get_attribute('tabindex')=='0',wrap.get_attribute('tabindex')
 assert 'Comparatif fiscal' in wrap.get_attribute('aria-label')
 assert page.locator('#tab2').get_attribute('tabindex')=='-1'
 page.locator('#tab1').focus();page.keyboard.press('ArrowRight')
 assert page.evaluate('document.activeElement.id')=='tab2'
 assert page.locator('#tab2').get_attribute('tabindex')=='0'
 page.keyboard.press('End');assert page.evaluate('document.activeElement.id')=='tab3'
 page.keyboard.press('Home');assert page.evaluate('document.activeElement.id')=='tab1'
 print('Chromium : tables focusables + nom, flèches, Home, End, focus OK')
 b.close()
