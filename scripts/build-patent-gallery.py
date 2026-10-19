from pathlib import Path
import json
import html
import re
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'reports' / 'quality'
OUT = ROOT / 'agents' / 'bad-patent-office'
OUT.mkdir(parents=True, exist_ok=True)

def read(case):
    value = json.loads((DATA / f'{case}.json').read_text(encoding='utf-8-sig'))
    assert value['httpStatus'] == 200 and isinstance(value['response']['answer'], str)
    assert re.fullmatch(r'0x[0-9a-fA-F]{64}', value['tx'])
    return value

def answer_markup(text):
    result, paragraph, code = [], [], None
    def flush():
        if paragraph:
            result.append('<p>' + html.escape(' '.join(paragraph)) + '</p>')
            paragraph.clear()
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.startswith('```'):
            flush()
            if code is None:
                code = []
            else:
                result.append('<pre>' + html.escape('\n'.join(code)) + '</pre>')
                code = None
            continue
        if code is not None:
            code.append(line)
        elif not line.strip():
            flush()
        elif index == 0 or line.startswith('#'):
            flush()
            result.append('<h3>' + html.escape(line.lstrip('# ').strip()) + '</h3>')
        elif line.startswith(('FIGURE', 'CLAIM', 'BENCH TEST', 'REMOVE ONE PART', 'NEXT PULL', 'REVISION CALL')):
            flush()
            result.append('<p class="section-label">' + html.escape(line) + '</p>')
        elif line.startswith(('A:', 'B:', 'C:')):
            flush()
            result.append('<p class="choice">' + html.escape(line) + '</p>')
        else:
            paragraph.append(line)
    flush()
    if code is not None:
        result.append('<pre>' + html.escape('\n'.join(code)) + '</pre>')
    return ''.join(result)

def card(case, label, opened=False):
    r = read(case)
    source = f'../../reports/quality/{case}.json'
    tx = 'https://robinhoodchain.blockscout.com/tx/' + r['tx']
    return f'''<details {'open' if opened else ''}><summary><span>{html.escape(label)}</span><small>Actual paid test ↗</small></summary><div class="card-body"><p class="input">INPUT / {html.escape(r['input'].splitlines()[0])}</p>{answer_markup(r['response']['answer'])}<div class="evidence"><a href="{source}">Raw response + prompt hash</a><a href="{tx}" target="_blank" rel="noopener">Payment receipt ↗</a></div></div></details>'''

cards = card('patent-final-single', 'The app that postpones the task', True)

page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Fictional patent sketches for familiar work habits. Real paid outputs from BAD PATENT OFFICE."><title>BAD PATENT OFFICE | Fictional patents for familiar habits</title><style>
:root{--paper:#f4f0df;--ink:#211b27;--violet:#7435aa;--lime:#d5f637;--line:#c7c0b1}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.7 system-ui,sans-serif}a{color:inherit}header,main,footer{max-width:1120px;margin:auto;padding-left:32px;padding-right:32px}header{padding-top:22px;padding-bottom:22px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;font-size:12px;font-weight:650;letter-spacing:1px}header a{text-decoration:none}.hero{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:48px 0}.eyebrow{font-size:10px;letter-spacing:2.5px;font-weight:700}.hero h1{font:normal clamp(42px,5.5vw,68px)/1.05 Georgia,serif;letter-spacing:-2px;margin:16px 0 24px}.hero p{max-width:520px}.hero img{width:100%;display:block;mix-blend-mode:multiply;border-radius:50%}.button{display:inline-block;background:var(--ink);color:var(--lime);padding:12px 20px;text-decoration:none;font-size:13px;font-weight:650;margin-top:14px}.secondary{font-size:12px;margin-left:15px}.caption{font-size:11px;color:#625970}.intro{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.intro b{display:block;font:22px Georgia,serif}.intro p{font-size:12px;margin-bottom:0}.section-title{font:34px Georgia,serif;margin:44px 0 10px;letter-spacing:-1px}.sub{font-size:12px;max-width:760px;color:#625970}details{border:1px solid var(--line);background:#fffdf5;margin:14px 0}summary{cursor:pointer;padding:20px 24px;display:flex;justify-content:space-between;gap:15px;font:23px Georgia,serif}summary small{font:10px system-ui,sans-serif;color:#625970;white-space:nowrap}summary::marker{color:var(--violet)}details[open] summary{border-bottom:1px solid var(--line);background:#e9e1f0}.card-body{padding:22px 28px}.card-body h3,.revision h3{font:27px Georgia,serif;line-height:1.2}.input{font-size:11px;color:#625970;border-left:3px solid var(--violet);padding-left:12px}.section-label{font-size:12px;font-weight:700;margin-top:23px;line-height:1.7}.card-body p:not(.input):not(.section-label),.revision p:not(.eyebrow):not(.section-label){max-width:850px}.card-body pre,.revision pre{background:#211b27;color:#ecf6bc;padding:22px;font:12px/1.8 Consolas,monospace;overflow-x:auto;border-left:4px solid var(--lime);white-space:pre}.evidence{border-top:1px solid var(--line);padding-top:15px;margin-top:24px;display:flex;gap:24px;font-size:10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}.revision{padding:24px;background:#fffdf5;border:1px solid var(--line);font-size:12px}.revision h3{font-size:23px}.revision pre{font-size:10px;padding:14px}.review{border-top:1px solid var(--line);margin-top:32px;padding-top:18px;font-size:12px;color:#625970}footer{padding-top:28px;padding-bottom:30px;margin-top:35px;border-top:1px solid var(--line);display:flex;gap:24px;flex-wrap:wrap;font-size:11px}:focus-visible{outline:3px solid var(--violet);outline-offset:4px}@media(max-width:760px){header,main,footer{padding-left:18px;padding-right:18px}.hero{grid-template-columns:1fr;gap:18px;padding:32px 0}.hero img{max-width:300px;margin:auto}.hero h1{font-size:48px}.intro{grid-template-columns:1fr;gap:12px}.pair{grid-template-columns:1fr}summary{padding:18px;font-size:20px;display:block}summary small{display:block;margin-top:5px}.card-body{padding:18px}.card-body pre{font-size:10px;padding:14px}.secondary{display:inline-block;margin-top:12px}.section-title{font-size:30px}.evidence{flex-wrap:wrap;gap:10px}}
.choice{border-left:2px solid var(--violet);padding-left:12px}.pulls{display:flex;gap:12px;flex-wrap:wrap}.pulls a{background:var(--lime);border:1px solid #b7c239;text-decoration:none;padding:7px 12px;font-size:11px;font-weight:600}</style></head><body><header><a href="../../">A2A FIELD NOTES / BAD PATENT OFFICE</a><a href="https://a2a.family/agents/view/?id=bad-patent-office" target="_blank" rel="noopener">Live agent ↗</a></header><main><section class="hero"><div><p class="eyebrow">FICTIONAL INVENTIONS. FAMILIAR HABITS.</p><h1>A familiar loop.<br>An absurd machine.</h1><p>Bring a pattern you keep repeating. Get a three-part absurd machine, a mock patent claim and an imagined bench test. A small satirical artifact about the busywork we keep defending.</p><a class="button" href="https://a2a.family/agents/view/?id=bad-patent-office&amp;q=Our%20team%20holds%20meetings%20about%20how%20to%20hold%20fewer%20meetings.#live" target="_blank" rel="noopener">Make a sketch · $0.01 ↗</a><a class="secondary" href="#examples">Read actual outputs ↓</a><p class="caption">Hosted on a2a.family. Fictional sketches. One input, one artifact. No real filing or simulation.</p></div><img src="logo.webp" alt="A halftone purple stamp machine feeding its own paper loop, with a lime crank and a loose bolt"></section><section class="intro"><div><b>01 / Bring a loop</b><p>A work habit, a recurring frustration or a plan that keeps producing the same result.</p></div><div><b>02 / Get the apparatus</b><p>Three parts, one mock claim and an imagined bench test showing the pattern.</p></div><div><b>03 / Spot the incentive</b><p>Read the imagined bench test. Notice what the machine keeps protecting.</p></div></section><h2 class="section-title" id="examples">Read the sketches.</h2><p class="sub">These are captured paid test outputs, not marketing mockups or customer testimonials. They are self-funded creator tests. The raw records preserve the input, answer, prompt hash and transaction reference.</p>''' + cards + '''<p class="review">Creative quality varies. Revision tests failed consistency checks, so the live offer was narrowed to single-turn sketches. The captured output above is not evidence of reliable multi-turn simulation. <a href="https://github.com/Ticoworld/a2a-bounty-lab/blob/main/agents/bad-patent-office/review.md">Read the test review and limits</a> · <a href="https://github.com/Ticoworld/a2a-bounty-lab/blob/main/agents/bad-patent-office/design.md">Agent design: image + service paragraph</a></p></main><footer><a href="https://a2a.family/agents/view/?id=bad-patent-office">BAD PATENT OFFICE ↗</a><a href="https://github.com/Ticoworld/a2a-bounty-lab">Source and execution evidence ↗</a><span>Actual test captures · 19 October 2026</span></footer></body></html>'''
(OUT / 'index.html').write_text(page, encoding='utf-8')
print(f'Built gallery from {len(cards)} HTML characters from a verified paid response.')
