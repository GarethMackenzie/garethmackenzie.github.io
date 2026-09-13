from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import re

W, H = 1200, 630
OUT = Path('assets/social')
OUT.mkdir(parents=True, exist_ok=True)
BG=(17,21,26); GOLD=(240,207,152); GOLD_DIM=(215,171,103); PAPER=(242,238,229); MUTED=(185,190,193); HAIR=(52,58,63)
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

CARDS=[
('01','CAPITAL ALLOCATION','Capital allocation is the operating system of wealth.','capital-allocation'),
('02','LEVERAGE','Leverage should multiply a system, not a weakness.','leverage'),
('03','ASYMMETRIC RISK','Design the shape of the risk before you chase the upside.','asymmetric-risk'),
('04','BUSINESS SYSTEMS','A system turns good decisions into repeatable outcomes.','business-systems'),
('05','DECISION-MAKING','Decision quality depends on the frame before the choice.','decision-making'),
('06','COMPOUNDING','Compounding rewards continuity more than intensity.','compounding'),
('07','INFORMATION ADVANTAGE','Information advantage is about better decisions, not more data.','information-advantage'),
('08','OWNERSHIP','Ownership changes the relationship between effort and outcome.','ownership'),
('09','SCALE','Scale should expand what already works.','scale'),
('10','STRATEGIC EXECUTION','Strategy becomes real only when execution has a system.','strategic-execution')]

def font(path,size): return ImageFont.truetype(path,size)

def wrap(draw,text,max_width,max_lines=3,start=64,minimum=46):
    for size in range(start,minimum-1,-2):
        f=font(SERIF,size); lines=[]; cur=''
        for word in text.split():
            test=word if not cur else cur+' '+word
            if draw.textbbox((0,0),test,font=f)[2] <= max_width: cur=test
            else:
                if cur: lines.append(cur)
                cur=word
        if cur: lines.append(cur)
        if len(lines)<=max_lines: return f,lines
    return font(SERIF,minimum), lines[:max_lines]

def base(draw):
    for x in range(0,W,60): draw.line((x,0,x,H),fill=(22,27,32),width=1)
    for y in range(0,H,60): draw.line((0,y,W,y),fill=(22,27,32),width=1)
    draw.ellipse((-210,-180,430,420),fill=(22,25,28)); draw.ellipse((-160,-130,340,330),fill=(27,29,31))
    m=54; draw.rectangle((m,m,W-m,H-m),outline=HAIR,width=1); draw.line((m,118,W-m,118),fill=HAIR,width=1); draw.line((870,m,870,H-m),fill=HAIR,width=1)
    for x,y,sx,sy in [(m,m,1,1),(W-m,m,-1,1),(m,H-m,1,-1),(W-m,H-m,-1,-1)]:
        draw.line((x,y,x+sx*24,y),fill=GOLD_DIM,width=2); draw.line((x,y,x,y+sy*24),fill=GOLD_DIM,width=2)

def card(number,theme,title,slug):
    img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img); base(d)
    d.text((78,72),'BUILT.',font=font(SERIF,34),fill=PAPER); d.text((960,77),f'INSIGHT {number}/10',font=font(SANS,14),fill=GOLD)
    d.text((78,154),theme,font=font(SANS_BOLD,18),fill=GOLD)
    f,lines=wrap(d,title,710); y=206
    for line in lines:
        d.text((78,y),line,font=f,fill=PAPER); bb=d.textbbox((78,y),line,font=f); y += bb[3]-bb[1]+10
    qy=min(493,y+24); d.line((78,qy,690,qy),fill=GOLD_DIM,width=2); d.text((78,qy+18),'IDEAS FROM BUILT, EXPANDED.',font=font(SANS,14),fill=MUTED)
    cx=1008; d.ellipse((cx-46,178,cx+46,270),outline=GOLD_DIM,width=1); d.line((cx,178,cx,270),fill=GOLD_DIM,width=1); d.line((cx-46,224,cx+46,224),fill=GOLD_DIM,width=1)
    d.multiline_text((955,315),'GARETH ANDREW\nMACKENZIE',font=font(SANS,17),fill=PAPER,spacing=7); d.text((955,395),'AUTHOR OF BUILT',font=font(SANS,13),fill=MUTED)
    d.text((78,560),'garethmackenzie.github.io/insights/',font=font(SANS,15),fill=MUTED); d.multiline_text((955,555),'HOW WEALTH IS\nDELIBERATELY CONSTRUCTED',font=font(SANS,12),fill=MUTED,spacing=5)
    img.save(OUT/f'{slug}.png','PNG',optimize=True)

def index_card():
    img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img); base(d)
    d.text((78,72),'BUILT.',font=font(SERIF,34),fill=PAPER); d.text((875,72),'GARETH ANDREW MACKENZIE',font=font(SANS,14),fill=MUTED)
    d.text((78,155),'INSIGHTS',font=font(SANS_BOLD,18),fill=GOLD)
    f,lines=wrap(d,'Ten themes. One system.',760,max_lines=2,start=76,minimum=58); y=220
    for line in lines:
        d.text((78,y),line,font=f,fill=PAPER); bb=d.textbbox((78,y),line,font=f); y+=bb[3]-bb[1]+10
    d.multiline_text((78,400),'A connected ten-essay series on capital, leverage, risk, systems,\ndecisions, compounding, information, ownership, scale and execution.',font=font(SANS,20),fill=MUTED,spacing=9)
    for i in range(10):
        x=78+i*95; d.text((x,520),f'{i+1:02d}',font=font(SERIF,20),fill=GOLD if i in (0,9) else (145,145,145))
        if i<9: d.line((x+32,533,x+82,533),fill=HAIR,width=1)
    d.text((875,555),'garethmackenzie.github.io/insights/',font=font(SANS,14),fill=MUTED)
    img.save(OUT/'insights-series.png','PNG',optimize=True)

def meta_pattern(prop, attribute='property'):
    return rf'<meta {attribute}="{re.escape(prop)}" content="[^"]*">'

def set_meta(text, prop, value, attribute='property'):
    pattern=meta_pattern(prop,attribute)
    replacement=f'<meta {attribute}="{prop}" content="{value}">'
    if re.search(pattern,text): return re.sub(pattern,replacement,text,count=1)
    return text

def remove_meta(text, prop, attribute='property'):
    return re.sub(meta_pattern(prop,attribute),'',text)

def ensure_after(text, anchor_prop, new_tag, attribute='property'):
    if new_tag in text: return text
    pattern=rf'(<meta {attribute}="{re.escape(anchor_prop)}" content="[^"]*">)'
    return re.sub(pattern,rf'\1{new_tag}',text,count=1)

def wire_page(path,image_name,alt):
    text=path.read_text(encoding='utf-8')
    image=f'https://garethmackenzie.github.io/assets/social/{image_name}'

    text=set_meta(text,'og:image',image)
    text=set_meta(text,'twitter:image',image,attribute='name')

    # Remove previously generated metadata before inserting a single canonical set.
    for prop in ('og:image:width','og:image:height','og:image:type','og:image:alt'):
        text=remove_meta(text,prop)
    text=remove_meta(text,'twitter:image:alt',attribute='name')

    text=ensure_after(text,'og:image','<meta property="og:image:width" content="1200">')
    text=ensure_after(text,'og:image:width','<meta property="og:image:height" content="630">')
    text=ensure_after(text,'og:image:height','<meta property="og:image:type" content="image/png">')
    text=ensure_after(text,'og:image:type',f'<meta property="og:image:alt" content="{alt}">')
    text=ensure_after(text,'twitter:image',f'<meta name="twitter:image:alt" content="{alt}">',attribute='name')
    text=re.sub(r'"image":"https://garethmackenzie\.github\.io/assets/[^"]+"',f'"image":"{image}"',text,count=1)
    path.write_text(text,encoding='utf-8')

for c in CARDS: card(*c)
index_card()

for number,theme,title,slug in CARDS:
    wire_page(Path('insights')/slug/'index.html',f'{slug}.png',f'{title} — BUILT Insight by Gareth Andrew Mackenzie')
wire_page(Path('insights/index.html'),'insights-series.png','BUILT Insights — ten essay series by Gareth Andrew Mackenzie')

print(f'Generated {len(CARDS)+1} social cards and aligned Insights metadata')
