from pathlib import Path

path = Path(r"d:\safeguardsecurities\our-team\index.html")
html = path.read_text(encoding="utf-8")

old = """\t\t\t\t<div class="sg-team-intro-visual" aria-hidden="true">
\t\t\t\t\t<img src="../wp-content/uploads/sites/12/2022/02/our-team.png" alt="" width="640" height="480" loading="lazy" />
\t\t\t\t</div>
\t\t\t\t\t</motion.div>
\t\t</div>
\t\t\t\t\t\t\t</div>
\t\t</section>"""

old = old.replace("<motion.div", "<motion.div>")  # noop fix

old = """				<div class="sg-team-intro-visual" aria-hidden="true">
					<img src="../wp-content/uploads/sites/12/2022/02/our-team.png" alt="" width="640" height="480" loading="lazy" />
				</div>
					</div>
		</div>
							</div>
		</section>"""

new = """					</div>
		</div>
				<div class="elementor-column elementor-col-50 elementor-top-column elementor-element sg-team-intro-col sg-team-intro-col--visual" data-element_type="column">
			<div class="elementor-widget-wrap elementor-element-populated">
				<div class="sg-team-intro-visual">
					<img src="../wp-content/uploads/sites/12/2022/02/our-team.png" alt="" loading="lazy" />
				</div>
					</div>
		</div>
							</div>
		</section>"""

if old not in html:
    raise SystemExit("pattern not found")

html = html.replace(old, new, 1)
path.write_text(html, encoding="utf-8")
print("ok")
