# 清河地區大地圖（手繪底圖版）的建圖工具
#   輸入：assets/worldmap2/wm_base_master.png（ChatGPT 畫的底圖，目前 1672×941）
#         assets/worldmap2/wm_base_full.png（用 Real-ESRGAN／Upscayl 放大 4 倍的版本；會縮成 K × TEX 倍。沒有就用 Lanczos 放大頂替、畫面偏糊）
#         tools/worldmap2_layout.json（地標入口、碰撞補正）
#   輸出：assets/worldmap2/chunks/r{列}c{欄}.webp（每塊涵蓋遊戲裡 CHUNK px 見方、解析度 TEX 倍；遊戲只畫看得到的那幾塊）
#         assets/worldmap2/wm_mini.webp（小地圖）
#         js/worldmap_data.js（地圖尺寸、地標、碰撞）
#         assets/worldmap2/debug_collision.png（碰撞檢查用：綠＝能走、紅＝補正擋住、藍＝補正可走）
# 用法：python3 tools/build_worldmap2.py
#
# 碰撞的判斷方式：底圖上「土路色」與「平順的草地色」是能走的候選，再只保留從入口、道路起點連得到的部分，
#   山上零散的亮塊、茅草屋頂就不會被誤判；建築、橋面等再用 layout 的 block／walk 補正
import json, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'worldmap2')
K = 1         # 遊戲座標 = 底圖像素 × K（碰撞格也是一格 K px，可以是小數）。試過 1、1.5、2、4 倍，定案用 1 倍（原圖大小）
CHUNK = 512   # 每塊分塊涵蓋遊戲座標幾 px
TEX = 3       # 貼圖密度：遊戲座標 1px 用幾個貼圖像素。畫布會用 2–3 倍解析度畫（全螢幕、Retina），貼圖也要有 3 倍才清楚
L = json.load(open(os.path.join(ROOT, 'tools', 'worldmap2_layout.json')))
master = Image.open(os.path.join(OUT, 'wm_base_master.png')).convert('RGB')
MW, MH = master.size
W, H = round(MW * K), round(MH * K)

# ---------- 1. 放大、切塊、小地圖 ----------
full_path = os.path.join(OUT, 'wm_base_full.png')
if os.path.exists(full_path):
    full = Image.open(full_path).convert('RGB')
    print('底圖：wm_base_full.png（AI 放大版）')
else:
    full = master
    print('底圖：沒有 wm_base_full.png，先用 Lanczos 放大頂替（畫面會偏糊）')
TW, TH = round(W * TEX), round(H * TEX)
if full.size != (TW, TH):
    full = full.resize((TW, TH), Image.LANCZOS)
TC = CHUNK * TEX  # 一塊分塊的貼圖像素
os.makedirs(os.path.join(OUT, 'chunks'), exist_ok=True)
ROWS, COLS = -(-H // CHUNK), -(-W // CHUNK)  # 無條件進位：右、下邊緣不滿一塊的照樣切（比較小塊）
for r in range(ROWS):
    for c in range(COLS):
        full.crop((c * TC, r * TC, min(TW, (c + 1) * TC), min(TH, (r + 1) * TC))).save(
            os.path.join(OUT, 'chunks', f'r{r}c{c}.webp'), quality=90, method=6)
master.resize((384, round(384 * MH / MW)), Image.LANCZOS).save(os.path.join(OUT, 'wm_mini.webp'), quality=90)  # 小地圖固定 384 寬，不跟倍率變
print(f'貼圖 {TW}×{TH}（{TEX} 倍）、分塊 {COLS}×{ROWS}、每塊涵蓋 {CHUNK}px')


# ---------- 2. 碰撞 ----------
def box_blur(x, r):
    k = 2 * r + 1
    c = np.pad(np.pad(x, r, mode='edge').cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def erode(m, r):
    return box_blur(m.astype(np.float32), r) > 0.999


def dilate(m, r):
    return box_blur(m.astype(np.float32), r) > 0.001


hsv = np.asarray(master.convert('HSV')).astype(np.float32)
hue, sat, val = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
lum = np.asarray(master.convert('L')).astype(np.float32)
std = np.sqrt(np.maximum(box_blur(lum * lum, 3) - box_blur(lum, 3) ** 2, 0))  # 樹叢、岩石紋理粗、草地平順
road = (hue > 28) & (hue < 50) & (sat > 0.35) & (sat < 0.75) & (val > 0.65)
grass = (hue > 45) & (hue < 100) & (sat > 0.45) & (val > 0.4) & (std < 32)
water = (hue > 170) & (hue < 215) & (sat > 0.3)

yy, xx = np.mgrid[0:MH, 0:MW]
blocked_fix = np.zeros((MH, MW), bool)
for k, b in L['block'].items():
    if k == '說明':
        continue
    l, t, r, bt = b
    blocked_fix[t:bt, l:r] = True
walk_fix = np.zeros((MH, MW), bool)
for k, (x1, y1, x2, y2, w) in ((k, v) for k, v in L['walk'].items() if k != '說明'):
    dx, dy = x2 - x1, y2 - y1
    t = np.clip(((xx - x1) * dx + (yy - y1) * dy) / max(1, dx * dx + dy * dy), 0, 1)
    walk_fix |= np.hypot(xx - (x1 + t * dx), yy - (y1 + t * dy)) < w / 2


def flood(mask, pts, label):
    """從 pts 出發、在 mask 裡四向連通的範圍"""
    out = np.zeros(mask.shape, bool)
    q = deque()
    for x, y in pts:
        if mask[y, x]:
            out[y, x] = True; q.append((x, y))
        elif label:
            print(f'  注意：{label}起點 ({x}, {y}) 落在不能走的地方')
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < MW and 0 <= ny < MH and mask[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True; q.append((nx, ny))
    return out


seeds = [v['at'] for k, v in L['landmarks'].items() if k != '說明'] + L['extraSeeds']
# 路網：土路色、連得到起點的部分；起點附近 6 格先算成路，起點才不會剛好落在路邊的雜點上
road_c = dilate(erode(road, 1), 1) | walk_fix
for x, y in seeds:
    road_c[max(0, y - 6):y + 7, max(0, x - 6):x + 7] = True
road_net = flood(road_c & ~dilate(water, 1) & ~blocked_fix | walk_fix, seeds, '道路')
road_net = dilate(road_net, 3)
# 路旁 NEAR 格以內的草地也能走：可以離開道路，但不會跑進遠處的山、林子
NEAR = 60  # 第 2 版底圖草原較開闊，從 40 放寬到 60
near = dilate(road_net, NEAR)
cand = (road_net | (dilate(erode(grass, 1), 1) & near)) & ~dilate(water, 1) & ~blocked_fix | walk_fix
walk = flood(cand, seeds, '')
# 補小洞（路上的小石頭、花叢）：膨脹再收縮，但不能補進補正擋住的地方
walk = (erode(dilate(walk, 2), 2) | walk) & ~((blocked_fix | water) & ~walk_fix)
print(f'碰撞：{MW}×{MH} 格、能走 {walk.mean() * 100:.1f}%')

dbg = (np.asarray(master).astype(np.float32) * 0.45).astype(np.uint8)
dbg[walk] = (dbg[walk] * 0.5 + np.array([0, 160, 0]) * 0.5).astype(np.uint8)
dbg[blocked_fix & ~walk_fix] = (220, 40, 40)
dbg[walk_fix] = (60, 140, 255)
for x, y in seeds:
    dbg[max(0, y - 2):y + 3, max(0, x - 2):x + 3] = (255, 255, 0)
Image.fromarray(dbg).save(os.path.join(OUT, 'debug_collision.png'))

# 每列寫成「擋、走、擋、走……」交替的格數（36 進位），讀檔時解開
rows = []
for row in walk:
    runs, cur, n = [], False, 0
    for v in row:
        if v == cur:
            n += 1
        else:
            runs.append(n); cur, n = v, 1
    runs.append(n)
    rows.append(','.join(np.base_repr(r, 36).lower() for r in runs))

# ---------- 3. 輸出 js/worldmap_data.js ----------
lms = [{'id': k, 'x': round(v['at'][0] * K), 'y': round(v['at'][1] * K), 'lx': round(v['label'][0] * K), 'ly': round(v['label'][1] * K)}
       for k, v in L['landmarks'].items() if k != '說明']
js = f"""'use strict';
// 清河地區大地圖資料：由 tools/build_worldmap2.py 產生，不要手改（改 tools/worldmap2_layout.json 再重跑）
// 地面是手繪底圖切成的分塊：每塊涵蓋 {CHUNK}px 見方、貼圖解析度 {TEX} 倍（assets/worldmap2/chunks/r{{列}}c{{欄}}.webp）
const WM_W = {W}, WM_H = {H}, WM_CHUNK = {CHUNK}, WM_TEX = {TEX};
// 地標：id 對應 js/worldmap.js 的 WM_ENTRANCES；x, y 是入口（站在附近按 E），lx, ly 是地名牌
const WM_LANDMARKS = {json.dumps(lms, ensure_ascii=False)};
// 碰撞：每格 {K}px、{MW}×{MH} 格；每列是「擋、走、擋、走……」交替的格數（36 進位）
const WM_COLL = {{ k: {K}, w: {MW}, h: {MH}, rows: {json.dumps('|'.join(rows))} }};
"""
open(os.path.join(ROOT, 'js', 'worldmap_data.js'), 'w').write(js)
print('→ js/worldmap_data.js', len(js) // 1024, 'KB')
