"""Vérification navigateur locale (Chromium) sur 320/390/1350 px.
Ne remplace pas axe-core, Lighthouse, un lecteur d'écran ou un téléphone physique.
"""
import os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent/'dist'

def inlined(file):
    html=(ROOT/file).read_text(encoding='utf-8')
    def stylesheet(m):
        path=ROOT/m[1]
        return '<style>'+path.read_text(encoding='utf-8').replace('</style>','<\\/style>')+'</style>' if path.is_file() else ''
    html=re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',stylesheet,html)
    # No script execution is needed for scrollability, except on home tested separately.
    html=re.sub(r'<script[^>]*\bsrc="[^"]+"[^>]*></script>', '', html)
    return html

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox'])
    for width in (320,390,1350):
        for file in ('fiscal-individuel-570.html','distribution-ciblee-580.html'):
            page=browser.new_page(viewport={'width':width,'height':840})
            page.set_content(inlined(file),wait_until='domcontentloaded',timeout=45000)
            page.locator('details').evaluate_all('(nodes)=>nodes.forEach(n=>n.open=true)')
            wrappers=page.locator('.accessible-table-scroll')
            assert wrappers.count()>0,(file,'table absent')
            for i in range(wrappers.count()):
                el=wrappers.nth(i)
                if not el.is_visible(): continue
                assert el.get_attribute('role')=='region'
                assert el.get_attribute('tabindex')=='0'
                assert el.get_attribute('aria-label')
                style=el.evaluate('(e)=>getComputedStyle(e).overflowX')
                assert style in ('auto','scroll'),(file,style)
                if width<=390:
                    assert el.evaluate('(e)=>e.scrollWidth >= e.clientWidth'),(file,el.evaluate('(e)=>[e.scrollWidth,e.clientWidth]'))
            hint=page.locator('.table-scroll-help').first
            assert hint.is_visible() == (width<=700),(file,width)
            page.close()
        print(f'Tableaux accessibles {width}px : defilement, libelles et aide OK')
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content(inlined('contact-signalement.html'),wait_until='domcontentloaded')
    assert page.locator('#suivre a[type="application/atom+xml"]').count()==1
    assert page.locator('a[href*="issues/new"]').count()==1
    print('Contact : tickets publics et lien Atom presents')
    browser.close()
