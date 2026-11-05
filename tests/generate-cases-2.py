"""More generated cases: titles in names, due dates, other phrasings (seeded differently)."""
import json, random, sys
sys.argv += ['']
exec(open('/tmp/claude-0/-home-user/54038daf-c36f-5835-9eaa-ff4e6f3d1103/scratchpad/v2/gen.py').read().split('cases = []')[0])
random.seed(77)
cases = []
add = lambda lvl, text, *acc: cases.append({'level': lvl, 'text': text, 'accept': [list(a) if isinstance(a, list) else a for a in acc]})
TITLED = ['ام حسن', 'أبو أحمد', 'الحاج سيد', 'الأستاذ كريم', 'المعلم رضا', 'مدام منى', 'عم صبري', 'الدكتور هاني']
DUES = ['وهيدفع الخميس', 'وهيدفع أول الشهر', 'وهيدفع آخر الشهر', 'وهيدفع بعد أسبوع', 'على 3 دفعات', 'والفلوس آخر الشهر', '']
for _ in range(110):
    v, a = amt(); who = random.choice(TITLED + NAMES + ORGS)
    form = random.random()
    if form < .5: text = f'بعت لـ{who} بضاعة بـ {a} {random.choice(CREDW)} {random.choice(DUES)}'.strip()
    elif form < .75: text = f'بعت بضاعة لـ{who} بـ {a} {random.choice(CREDW)}'
    else: text = f'{who} اخد بضاعة بـ {a} {random.choice(CREDW)}' if who not in ORGS else f'بعنا لـ{who} بضاعة بـ {a} آجل'
    text = text.replace('لـأ', 'لأ').replace('لـال', 'لل')
    add('gen2-credit', text, [E(AR, v, S, -v)])
for _ in range(80):
    v, a = amt(); who = random.choice(TITLED + NAMES); m = random.choice(['cash', 'bank']); w = random.choice(CASHW[:3] if m == 'cash' else BANKIN)
    text = random.choice([f'حصلت من {who} {a} {w}', f'{who} دفع {a} {w} من اللي عليه', f'استلمت {a} من {who} {w}', f'{who} سدد اللي عليه {a} {w}'])
    add('gen2-collect', text, [E(C if m == 'cash' else B, v, AR, -v)])
for _ in range(70):
    v, a = amt(); m = random.choice(['cash', 'bank', 'credit']); w = random.choice(CASHW if m == 'cash' else BANKW if m == 'bank' else CREDW)
    when = random.choice([' امبارح', ' النهارده', f' يوم {random.randint(1, 28)}', ' أول امبارح', ''])
    text = random.choice([f'جبت بضاعة للمحل بـ {a} {w}{when}', f'اشترينا طلبية بـ {a} {w}{when}', f'دخلت بضاعة بـ {a} {w}{when}' if m == 'credit' else f'اشتريت بضايع بـ {a} {w}{when}'])
    add('gen2-buy', text, [E(INV, v, C if m == 'cash' else B if m == 'bank' else AP, -v)])
for _ in range(80):
    v, a = amt(); acc_e = random.choice(list(EXP)); what = random.choice(EXP[acc_e]); m = random.choice(['cash', 'bank']); w = random.choice(CASHW if m == 'cash' else BANKW)
    if acc_e == 'مصروف أدوات ومستلزمات': continue
    text = random.choice([f'دفعت {what} بتاع الشهر {a} {w}', f'صرفنا على {what} {a} {w}', f'دفعت {a} جنيه {what} {w}', f'سددت {what} {a} {w} النهارده'])
    add('gen2-exp', text, [E(acc_e, v, C if m == 'cash' else B, -v)])
seen = set(json.load(open(sys.argv[2])) if False else [])
out = []
for c in cases:
    if c['text'] in seen: continue
    seen.add(c['text']); out.append(c)
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
print(len(out))
