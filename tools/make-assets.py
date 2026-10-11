#!/usr/bin/env python3
"""
تولید تصاویر پروژهٔ «حلقهٔ آبی» (آیکون‌های PWA و تصویر OG)
با رندر صفحه‌های قالب در مرورگر headless — متن فارسی درست شکل می‌گیرد.

پیش‌نیاز:
    pip install playwright && python -m playwright install chromium
اجرا (از ریشهٔ پروژه):
    python tools/make-assets.py
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"
BASE = (ROOT / "tools").as_uri()

JOBS = [
    ("og-template.html", "og-image.png", 1200, 630),
    ("icon-template.html", "icon-512.png", 512, 512),
    ("icon-template.html", "icon-192.png", 192, 192),
    ("icon-template.html", "apple-touch-icon.png", 180, 180),
    ("icon-maskable-template.html", "icon-maskable-512.png", 512, 512),
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for tpl, out, w, h in JOBS:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.goto(f"{BASE}/{tpl}")
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / out), omit_background=(out != "og-image.png"))
            print("✓", out, f"{w}×{h}")
            page.close()
        browser.close()

if __name__ == "__main__":
    sys.exit(main())
