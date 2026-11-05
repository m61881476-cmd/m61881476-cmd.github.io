"""Generates extra parser test cases with known correct answers (net amount per account, debit +, credit −)."""
import json, random, sys
random.seed(2026)
C = 'النقدية بالصندوق'; B = 'النقدية بالبنك'; AR = 'العملاء'; AP = 'الموردون'; INV = 'المخزون'; S = 'إيرادات المبيعات'
CAP = 'رأس المال'; DR = 'المسحوبات الشخصية'
EXP = {
    'مصروف إيجار': ['إيجار المحل', 'الإيجار', 'إيجار المخزن', 'إيجار الشهر'],
    'مصروف رواتب': ['مرتبات العمال', 'المرتبات', 'يومية العمال', 'مرتب الكاشير', 'أجور العمال'],
    'مصروف كهرباء ومياه': ['فاتورة الكهربا', 'الكهربا', 'فاتورة المية', 'فاتورة الغاز'],
    'مصروف إنترنت واتصالات': ['النت', 'باقة النت', 'فاتورة التليفون', 'فاتورة الموبايل'],
    'مصروف نقل': ['نقل البضاعة', 'بنزين', 'مصاريف شحن', 'مواصلات', 'أجرة التاكسي'],
    'مصروف تسويق': ['إعلان على فيسبوك', 'دعاية', 'إعلانات ممولة', 'بروشورات'],
    'مصروف صيانة': ['صيانة التكييف', 'تصليح التلاجة', 'صيانة الكمبيوتر', 'تصليح الباب'],
    'مصروف أدوات ومستلزمات': ['أكياس', 'منظفات', 'أدوات مكتبية', 'مستلزمات تغليف'],
    'مصروف ضرائب ورسوم': ['رسوم الترخيص', 'ضرايب', 'دمغة', 'التأمينات'],
}
NAMES = ['محمد', 'أحمد', 'حسن', 'كريم', 'سيد', 'مصطفى', 'طارق', 'هاني', 'مينا', 'عمرو']
ORGS = ['شركة النيل', 'شركة الأمل', 'مطعم الشرق', 'صيدلية الشفا', 'مؤسسة النور']
CASHW = ['كاش', 'نقدي', 'نقدا', 'كاش من الدرج']
BANKW = ['من البنك', 'تحويل', 'تحويل بنكي', 'انستاباي', 'بالفيزا']
BANKIN = ['تحويل', 'تحويل بنكي', 'انستاباي', 'على البنك']
CREDW = ['على الحساب', 'آجل', 'بالآجل', 'شكك']
AR_DIG = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
WORDS = {150: 'مية وخمسين', 500: 'خمسمية', 1000: 'ألف', 1500: 'ألف وخمسمية', 2000: 'ألفين', 2500: 'ألفين ونص', 3000: 'تلت آلاف', 4000: 'أربعتلاف', 5000: 'خمستلاف', 10000: 'عشرتلاف', 20000: 'عشرين ألف'}


def amt():
    v = random.choice([random.randrange(50, 1000, 10), random.randrange(1000, 20000, 50), random.randrange(20000, 300000, 1000), random.choice(list(WORDS))])
    f = random.random()
    if v in WORDS and f < .45: return v, WORDS[v]
    if v >= 1000 and v % 1000 == 0 and f < .6: return v, f'{v // 1000} ألف'
    if f < .75: return v, str(v)
    if f < .88 and v >= 1000: return v, f'{v:,}'
    return v, str(v).translate(AR_DIG)


def E(*p):
    d = {}
    for i in range(0, len(p), 2): d[p[i]] = d.get(p[i], 0) + p[i + 1]
    return d


cases = []
add = lambda lvl, text, *acc: cases.append({'level': lvl, 'text': text, 'accept': [list(a) if isinstance(a, list) else a for a in acc]})
# 1) sales
for _ in range(110):
    v, a = amt(); m = random.choice(['cash', 'bank', 'credit'])
    w = random.choice(CASHW[:3] if m == 'cash' else BANKIN if m == 'bank' else CREDW)
    verb = random.choice(['بعت بضاعة بـ', 'بعنا بضاعة بـ', 'بعت بضاعة ب', 'بيع بضاعة بـ', 'تم بيع بضاعة بمبلغ', 'بعت بضايع بـ'])
    who = random.choice(['', f' لـ{random.choice(NAMES)}', f' لـ{random.choice(ORGS)}']) if m == 'credit' or random.random() < .3 else ''
    when = random.choice(['', '', ' امبارح', ' النهارده', f' يوم {random.randint(1, 28)}'])
    if who: text = f'{verb.split(" بـ")[0].split(" ب")[0].split(" بمبلغ")[0]}{who} {verb.split(" ", 2)[-1] if False else ""}'.strip()
    text = f'{verb} {a} {w}{when}'
    if who: text = text.replace('بضاعة', 'بضاعة' + who, 1).replace('بضايع', 'بضايع' + who, 1)
    acc = C if m == 'cash' else B if m == 'bank' else AR
    alts = [[E(acc, v, S, -v)]]
    if m == 'bank' and 'انستاباي' in w: pass
    add('gen-sale', text, *alts)
# 2) purchases
for _ in range(90):
    v, a = amt(); m = random.choice(['cash', 'bank', 'credit'])
    w = random.choice(CASHW if m == 'cash' else BANKW if m == 'bank' else CREDW)
    verb = random.choice(['اشتريت بضاعة بـ', 'اشترينا بضاعة بـ', 'جبت بضاعة بـ', 'اشتريت خامات بـ', 'جبنا طلبية بـ', 'شراء بضاعة بـ'])
    frm = f' من {random.choice(ORGS)}' if m == 'credit' and random.random() < .6 else ''
    text = f'{verb} {a} {w}'
    if frm: text = text.replace(' بـ', frm + ' بـ', 1)
    acc = C if m == 'cash' else B if m == 'bank' else AP
    add('gen-buy', text, [E(INV, v, acc, -v)])
# 3) expenses
for _ in range(170):
    v, a = amt(); acc_e = random.choice(list(EXP)); what = random.choice(EXP[acc_e]); m = random.choice(['cash', 'bank'])
    w = random.choice(CASHW if m == 'cash' else BANKW)
    verb = random.choice(['دفعت', 'دفعنا', 'صرفت', 'سددت', 'دفعت'])
    form = random.random()
    if acc_e == 'مصروف أدوات ومستلزمات': text = f'اشتريت {what} بـ {a} {w}' if form < .6 else f'دفعت {a} {what} {w}'
    elif form < .55: text = f'{verb} {what} {a} {w}'
    elif form < .8: text = f'{verb} {a} {what} {w}'
    else: text = f'{what} {a} دفعتها {w}' if acc_e != 'مصروف رواتب' else f'{verb} {what} بمبلغ {a} {w}'
    acc = C if m == 'cash' else B
    add('gen-exp', text, [E(acc_e, v, acc, -v)])
# 4) collections
for _ in range(70):
    v, a = amt(); m = random.choice(['cash', 'bank']); w = random.choice(CASHW[:3] if m == 'cash' else BANKIN)
    p = random.choice(NAMES + ORGS)
    form = random.random()
    if form < .35: text = f'حصلت من {p} {a} {w}'
    elif form < .55: text = f'استلمت من {p} {a} {w}'
    elif form < .7: text = f'قبضت من {p} {a} {w}'
    elif form < .85: text = f'{"العميل" if p in NAMES else p} سدد {a} {w}' if p not in NAMES else f'{p} سدد اللي عليه {a} {w}'
    else: text = f'تحصيل {a} من {p} {w}'
    add('gen-collect', text, [E(C if m == 'cash' else B, v, AR, -v)])
# 5) supplier payments
for _ in range(50):
    v, a = amt(); m = random.choice(['cash', 'bank']); w = random.choice(CASHW if m == 'cash' else BANKW)
    p = random.choice(ORGS[:2] + ['المورد'])
    text = random.choice([f'دفعت لـ{p} {a} {w}', f'سددت لـ{p} {a} {w}', f'دفعت {a} لـ{p} {w}']).replace('لـالمورد', 'للمورد')
    add('gen-supp', text, [E(AP, v, C if m == 'cash' else B, -v)])
# 6) capital, drawings, transfers
for _ in range(25):
    v, a = amt(); m = random.choice(['cash', 'bank'])
    add('gen-cap', random.choice([f'حطيت {a} رأس مال {"كاش" if m == "cash" else "في البنك"}', f'زودت رأس المال {a} {"كاش" if m == "cash" else "في البنك"}']), [E(C if m == 'cash' else B, v, CAP, -v)])
for _ in range(25):
    v, a = amt(); m = random.choice(['cash', 'bank'])
    add('gen-draw', random.choice([f'خدت {a} {"من الدرج" if m == "cash" else "من البنك"} للبيت', f'سحبت {a} {"من الدرج" if m == "cash" else "من البنك"} لمصاريف البيت', f'مسحوبات شخصية {a} {"كاش" if m == "cash" else "من البنك"}']), [E(DR, v, C if m == 'cash' else B, -v)])
for _ in range(25):
    v, a = amt()
    if random.random() < .5: add('gen-move', random.choice([f'أودعت {a} في البنك', f'نزلت {a} من الدرج للبنك', f'حطيت {a} من الخزنة في البنك']), [E(B, v, C, -v)])
    else: add('gen-move', random.choice([f'سحبت {a} من البنك للدرج', f'سحبت {a} كاش من البنك']), [E(C, v, B, -v)])
# 7) part cash part credit
for _ in range(35):
    v = random.randrange(2, 200) * 100; frac = random.choice([('نصها', .5), ('ربعها', .25), ('تلتها', 1 / 3)])
    first = round(v * frac[1], 2); rest = round(v - first, 2)
    if random.random() < .5:
        add('gen-split', f'بعت بضاعة بـ {v} {frac[0]} كاش والباقي على الحساب', [E(C, first, AR, rest, S, -v)])
    else:
        add('gen-split', f'اشتريت بضاعة بـ {v} {frac[0]} كاش والباقي آجل', [E(INV, v, C, -first, AP, -rest)])
# 8) lists of expenses with one payment way
for _ in range(45):
    k = random.randint(2, 3); accs = random.sample([a for a in EXP if a not in ('مصروف أدوات ومستلزمات', 'مصروف ضرائب ورسوم')], k)
    vals = [random.randrange(100, 9000, 50) for _ in accs]; m = random.choice(['cash', 'bank'])
    short = {'مصروف إيجار': 'إيجار', 'مصروف رواتب': 'مرتبات', 'مصروف كهرباء ومياه': 'كهربا', 'مصروف إنترنت واتصالات': 'نت', 'مصروف نقل': 'نقل', 'مصروف تسويق': 'إعلانات', 'مصروف صيانة': 'صيانة'}
    parts = [f'{short[a]} {v}' for a, v in zip(accs, vals)]
    tail = random.choice(['كله كاش', 'كلهم كاش', 'كاش']) if m == 'cash' else random.choice(['كله من البنك', 'كلهم من البنك'])
    sep = random.choice([' و', ' و ', '، '])
    text = 'دفعت ' + sep.join(parts) + ' ' + tail
    acc = C if m == 'cash' else B
    add('gen-list', text, [E(a, v, acc, -v) for a, v in zip(accs, vals)])
# 9) missing info / not a transaction
for t in ['بعت بضاعة', 'دفعت فلوس', 'اشتريت حاجات', 'حصلت فلوس', 'دفعت للمورد', 'بعت بضاعة كاش', 'دفعت الإيجار']:
    add('gen-ask', t, 'Q', 'NONE')
for t in ['كام رصيد البنك؟', 'كسبت كام النهارده؟', 'هدفع الإيجار بكرة 5000', 'ناوي أشتري بضاعة بـ 20000', 'ما دفعتش الكهربا لسه', 'لو بعت بـ 3000 هكسب كام؟', 'مين عليه فلوس؟', 'صباح الفل', 'شكرا يا دفتر', 'عامل ايه']:
    add('gen-none', t, 'NONE', 'Q')
seen = set(); out = []
for c in cases:
    if c['text'] in seen: continue
    seen.add(c['text']); out.append(c)
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
print(len(out))
