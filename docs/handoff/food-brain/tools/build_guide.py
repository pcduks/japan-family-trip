"""Build the trip food guide datasets from the repo's food data.

Reads v2/data (food-deep, food-guide, food-deadlines, plan-days) and the
scout's validated.json if present. Writes one JSON file per dataset into
OUT, and prints every check that failed so nothing silently ships wrong.
"""
import datetime as dt
import glob
import json
import os
import re
import sys

REPO = '/home/user/japan-family-trip/v2/data'
SCRATCH = '/tmp/claude-0/-home-user-japan-family-trip/e34b5d0a-646d-57b0-84f9-185e40f9f4c1/scratchpad'
OUT = os.path.join(SCRATCH, 'guide', 'out')
os.makedirs(OUT, exist_ok=True)

TODAY = dt.date(2026, 10, 19)
WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

CITY_NAME = {'tokyo': 'Tokyo', 'kanazawa': 'Kanazawa', 'kyoto': 'Kyoto', 'nara': 'Nara',
             'kawaguchiko': 'Kawaguchiko', 'nagano': 'Nagano', 'yudanaka': 'Yudanaka',
             'takayama': 'Takayama', 'hakone': 'Hakone', 'hiroshima': 'Hiroshima'}


def d(s):
    return dt.date.fromisoformat(s)


def span(a, b):
    a, b = d(a), d(b)
    return [a + dt.timedelta(n) for n in range((b - a).days + 1)]


# The days we can eat in each city, from plan-days.json.
STAY = {
    'tokyo': span('2026-12-20', '2026-12-23') + span('2027-01-07', '2027-01-08'),
    'nagano': [d('2026-12-24'), d('2026-12-26')],
    'yudanaka': span('2026-12-24', '2026-12-27'),
    'kanazawa': span('2026-12-27', '2026-12-30'),
    'kyoto': span('2026-12-30', '2027-01-05'),
    'nara': [d('2027-01-04')],
    'kawaguchiko': span('2027-01-05', '2027-01-07'),
}
ORDER = ['tokyo', 'nagano', 'yudanaka', 'kanazawa', 'kyoto', 'nara', 'kawaguchiko',
         'takayama', 'hakone', 'hiroshima']


def fmt_day(x):
    return f"{WD[x.weekday()]} {x.day} {x.strftime('%b')}"


# --- Concierge rulings that override the raw data (see the food-concierge skill). ---
FERNANDA_FIX = {
    'Kabuna': 'Raw shellfish and shirako are on the menu: order the jibuni, crab and cooked dishes.',
    'Oden Izakaya Miyuki': 'The oden is cooked; skip the raw shellfish sides.',
    'Kishidaya': 'Nikomi and cooked dishes are fine; skip the shellfish sashimi.',
    'Yakiniku Jumbo Shirokane': 'Wagyu comes rare by default: grill hers all the way through, nothing raw or tataki.',
}
DONT_BOTHER = {
    'Sushi Saito': 'Regulars or a hotel concierge with a relationship only; it can’t take seven.',
    'Nihonbashi Kakigarachō Sugita': 'Regulars rebook on the way out: in practice, a connection only.',
    'Suzutashiki': 'A year-and-a-half wait was reported in 2023; December 2026 is a cancellation at best.',
    'Sawada': 'Seats drop online at random and the counter is small: only if two or three want to gamble.',
}
VERY_HARD = {'Kataori', 'Ogata', 'Den', 'Sazenka'}


def money(price):
    """Highest yen figure in a price string, or None."""
    if not price:
        return None
    s = price.replace(',', '')
    vals = []
    for num, k in re.findall(r'(\d+(?:\.\d+)?)\s*(k)?', s):
        v = float(num)
        if k or ('k' in s and v < 100):
            v *= 1000
        if v >= 300:
            vals.append(v)
    return max(vals) if vals else None


def style_of(p):
    m = money(p.get('price'))
    if m is None:
        return 'Price unverified'
    if m >= 15000:
        return 'Fancy'
    if m >= 5000:
        return 'Mid-range'
    return 'Casual'


BREAKFAST = ['kissaten', 'breakfast', 'horumon-don']
SNACK = ['wagashi', 'sweets', 'namagashi', 'kakigōri', 'mochi', 'tea room', 'tea house', 'kanmidokoro', 'oyaki', 'takeaway']
LUNCHY = ['ramen', 'soba', 'udon', 'curry', 'okonomiyaki', 'teishoku', 'yōshoku', 'tonkatsu', 'katsuretsu',
          'hōtō', 'hoto', 'kamameshi', 'kakinoha', 'saba-zushi', 'kaisen', 'monjayaki', 'shokudō', 'yudōfu', 'tofu', 'eel', 'unagi']


def meals_of(p):
    g = (p.get('genre') or '').lower()
    txt = ' '.join(str(p.get(k) or '') for k in ('booking', 'dec_jan', 'price')).lower()
    if p.get('meals'):
        out = [m.capitalize() for m in p['meals']]
    elif any(k in g for k in BREAKFAST):
        out = ['Breakfast', 'Lunch']
    elif any(k in g for k in SNACK):
        out = ['Snack']
    elif any(k in g for k in LUNCHY):
        out = ['Lunch', 'Dinner']
    else:
        out = ['Dinner']
        if 'lunch' in txt:
            out.insert(0, 'Lunch')
    if re.search(r'lunch only|until 15|10:00–14:00|11:00–15:00|8:30–13:30|6:30–13:00|9:00–16:00|7:00–15:00', txt):
        out = [m for m in out if m != 'Dinner'] or ['Lunch']
    if 'kissaten' in g or 'coffee' in g:
        out = ['Breakfast', 'Snack']
    early = re.sub(r'phone from \d', '', txt)
    if re.search(r'(?<![\d:])[5-8]:[0-5]\d', early) and 'Breakfast' not in out:
        out.insert(0, 'Breakfast')
    return out


CLASSIC_RE = re.compile(r'\b(since|founded|oldest|original|meiji|muromachi|edo|century|hundred-year|'
                        r'institution|heritage|1[5-8]\d\d|19[0-6]\d)\b', re.I)
LOCAL_RE = re.compile(r"tourists don.t reach|genuinely local|all-local|local crowd|locals know|queue is japanese", re.I)


def tags_of(p, critics, score, reviews):
    why = ' '.join(str(p.get(k) or '') for k in ('why', 'glance'))
    awards = str((p.get('tabelog') or {}).get('awards') or '')
    g = (p.get('genre') or '').lower()
    t = []
    if CLASSIC_RE.search(why):
        t.append('Classic')
    if re.search(r'Gold|Silver', awards) or (money(p.get('price')) or 0) >= 40000:
        t.append('Trophy')
    if (critics and score is not None and score < 3.5) or re.search(r'tourist show|weak local score|for the photo', why, re.I):
        t.append('Hyped')
    trophy = 'Trophy' in t
    quiet = score and score >= 3.6 and reviews and reviews < 800 and not critics and style_of(p) != 'Fancy'
    if p['name'] not in DONT_BOTHER and not trophy and (quiet or LOCAL_RE.search(why)):
        t.append('Hidden gem')
    if '百名店' in awards:
        t.append('百名店')
    if 'stand-up' in g or 'tachinomi' in g or 'standing' in (p.get('group') or '').lower():
        t.append('Standing')
    area = (p.get('area') or '').lower()
    if re.search(r'market|ōmichō|nishiki|tsukiji|toyosu', area):
        t.append('Market')
    if 'takeaway' in g or 'takeaway' in (p.get('group') or '').lower() or 'oyaki' in g:
        t.append('Street food & takeaway')
    if re.search(r'lunch[^·]*¥', str(p.get('price') or ''), re.I) and style_of(p) in ('Fancy', 'Mid-range'):
        t.append('Lunch deal')
    return t


KIND_RULES = [
    ('Sushi', ['sushi', 'kaisen', 'saba-zushi', 'kakinoha']),
    ('Tempura', ['tempura']),
    ('Tonkatsu & yōshoku', ['tonkatsu', 'katsuretsu', 'yōshoku', 'curry', 'okonomiyaki', 'monjayaki', 'teppanyaki']),
    ('Noodles', ['soba', 'udon', 'ramen', 'hōtō', 'sōmen']),
    ('Yakitori & chicken', ['yakitori', 'chicken']),
    ('Wagyu, yakiniku & sukiyaki', ['yakiniku', 'steak', 'sukiyaki', 'shabu', 'hida beef', 'shinshū beef']),
    ('Kaiseki & washoku', ['kaiseki', 'washoku', 'creative japanese', 'ryōtei', 'shōjin', 'regional cooking']),
    ('Tofu', ['yudōfu', 'tofu']),
    ('Eel', ['eel', 'unagi']),
    ('Chinese', ['chinese']),
    ('Izakaya & bars', ['izakaya', 'oden', 'obanzai', 'stand-up', 'sake bar', 'horumon', 'nikomi']),
    ('Sweets', ['wagashi', 'sweets', 'namagashi', 'mochi', 'kakigōri', 'kanmidokoro']),
    ('Coffee & tea', ['kissaten', 'tea room', 'tea house', 'coffee']),
    ('Breakfast & market food', ['breakfast', 'oyaki', 'pheasant']),
]


def kind_of(genre):
    g = (genre or '').lower()
    for label, keys in KIND_RULES:
        if any(k in g for k in keys):
            return label
    return 'Other'


def tier_of(p):
    name = p['name']
    if name in DONT_BOTHER:
        return "Don't bother"
    if name in VERY_HARD:
        return 'Very hard: try once'
    g = (p.get('genre') or '').lower()
    ch = p.get('booking_channel') or ''
    seven = p.get('seven')
    if 'takeaway' in g or 'takeaway' in (p.get('group') or '').lower():
        return 'Takeaway'
    if ch in ('queue', 'walk-in'):
        return 'Walk-in or queue'
    if seven in ('room', 'yes'):
        return 'Easy for seven'
    if seven in ('ask', 'counter'):
        return 'Doable with effort'
    if seven in ('split', 'no'):
        return 'Split the group'
    return 'Group fit unverified'


def open_dates(slug, p):
    days = STAY.get(slug, [])
    cw = set(p.get('closed_weekdays') or [])
    cd = set(p.get('closed_dates') or [])
    return [x for x in days if WD[x.weekday()] not in cw and x.isoformat() not in cd]


CRITIC_RULES = [
    ('migrationology', 'Mark Wiens'), ('kenjilopezalt', 'Kenji López-Alt'), ('pete_wells', 'Pete Wells'),
    ('fuchsiadunlop', 'Fuchsia Dunlop'), ('little_meg', 'Little Meg'), ('hitode47', 'Hideto Tashiro'),
    ('ocritico', 'Ian Oliver'), ('hungry', 'The Hungry Tourist'), ('jwang815', 'Jason Wang'),
]


def critic_list(p):
    out = []
    for c in p.get('critics') or []:
        who = c.get('who', '').lower()
        name = next((n for k, n in CRITIC_RULES if k in who), c.get('who'))
        out.append({'who': name, 'note': c.get('note', ''), 'url': c.get('url', '')})
    return out


# ---------------- places ----------------
places = []
by_name = {}
for f in sorted(glob.glob(os.path.join(REPO, 'food-deep', '*.json'))):
    slug = os.path.basename(f)[:-5]
    if slug == 'photos':
        continue
    data = json.load(open(f))
    for p in data.get('places', []):
        tab = p.get('tabelog') or {}
        score, reviews = tab.get('score'), tab.get('reviews')
        crit = critic_list(p)
        preg = p.get('pregnancy', 'unknown')
        note = p.get('pregnancy_note', '')
        if p['name'] in FERNANDA_FIX:
            preg, note = 'careful', FERNANDA_FIX[p['name']]
        opens = open_dates(slug, p)
        nye = bool(re.search(r'to confirm', p.get('dec_jan') or '', re.I))
        row = {
            'id': f"{slug}/{p['name']}",
            'city': CITY_NAME[slug],
            'city_order': ORDER.index(slug),
            'on_route': slug in STAY,
            'name': p['name'],
            'name_ja': p.get('name_ja', ''),
            'area': p.get('area', ''),
            'genre': p.get('genre', ''),
            'kind': kind_of(p.get('genre')),
            'style': style_of(p),
            'meals': ' | '.join(meals_of(p)),
            'tags': ' | '.join(tags_of(p, crit, score, reviews)),
            'price': p.get('price', ''),
            'tabelog': score,
            'reviews': reviews,
            'awards': tab.get('awards', ''),
            'tabelog_url': tab.get('url', ''),
            'critics': ' | '.join(c['who'] for c in crit),
            'critic_notes': json.dumps(crit, ensure_ascii=False),
            'pregnancy': preg,
            'pregnancy_note': note,
            'tier': tier_of(p),
            'tier_note': DONT_BOTHER.get(p['name'], ''),
            'seven': p.get('seven') or 'unverified',
            'group': p.get('group', ''),
            'open_on': ', '.join(fmt_day(x) for x in opens) if slug in STAY else 'Not on the route',
            'open_count': len(opens),
            'hours_to_confirm': nye,
            'closed': '; '.join(filter(None, [
                ('Closed ' + ', '.join(p['closed_weekdays'])) if p.get('closed_weekdays') else '',
                ('Closed ' + ', '.join(fmt_day(d(x)) for x in p['closed_dates'])) if p.get('closed_dates') else '',
            ])),
            'dec_jan': p.get('dec_jan', ''),
            'booking': p.get('booking', ''),
            'booking_channel': p.get('booking_channel', ''),
            'why': p.get('why', ''),
            'order': p.get('order', ''),
            'source': 'Trip data',
        }
        places.append(row)
        by_name[p['name']] = (slug, p, row)

# Scout-validated additions (only what the scout saw on Tabelog).
SCOUT = {
    'Tonkatsu Maisen Aoyama Honten': ('Easy for seven', 'Tonkatsu & yōshoku', 'ok', 'Fried through; ask for hers well done.', 'Private rooms for 8 and up; book online.'),
    'Sumiyaki Unafuji Yurakucho': ('Easy for seven', 'Eel', 'ok', 'Eel is cooked; skip the liver (kimo).', 'Room for 8; book online; set menus booked ahead.'),
    'Washoku Ukihashi (Hotel Granvia Kyoto)': ('Easy for seven', 'Kaiseki & washoku', 'careful', 'Kaiseki and sushi: say so when booking and ask for cooked swaps.', 'Room for 8; book online. New Year hours not on Tabelog.'),
    'Hoto Fudo Kawaguchiko Kita Honten': ('Walk-in or queue', 'Noodles', 'ok', 'Cooked: fine.', 'Bookings only for 10+, so seven walk in. Cash only.'),
    'Kamameshi Shizuka Koen-ten': ('Group fit unverified', 'Breakfast & market food', 'ok', 'Kamameshi is cooked rice: fine.', 'Tabelog page conflicts on bookings; closed Tuesdays.'),
    'Akadama Honten': ('Doable with effort', 'Izakaya & bars', 'careful', 'Oden is cooked; skip raw sides.', 'Book online; 96 seats, no private room. Cash only.'),
    'Omen Ginkakuji Honten': ('Doable with effort', 'Noodles', 'ok', 'Fine.', 'Book online; closed Thursdays (31 Dec).'),
    'Inoda Coffee Honten': ('Walk-in or queue', 'Coffee & tea', 'ok', 'Fine; one coffee.', 'No bookings; 211 seats.'),
    'Tachigui Sushi Akira (Shimbashi)': ('Split the group', 'Sushi', 'careful', 'Standing, raw fish: not for Fernanda or the parents. The sushi crew goes.', 'Seven standing spots; closed Wednesdays. Booking rules conflict on Tabelog.'),
    'Sushi Ginza Onodera Toryumon': ('Walk-in or queue', 'Sushi', 'careful', 'Standing, raw fish: the sushi crew only.', 'No bookings; ticket system.'),
    'Tempura Shinjuku Tsunahachi Sohonten': ("Don't bother", 'Tempura', 'ok', 'Fried: fine, if it reopens.', 'Tabelog listing on hold for a rebuild; the temporary annex scores 3.04.'),
}
val_path = os.path.join(SCRATCH, 'validated.json')
added = []
if os.path.exists(val_path):
    for v in json.load(open(val_path)):
        if v.get('status') == 'not found' or not v.get('tabelog_score'):
            continue
        try:
            score = float(v['tabelog_score'])
        except (TypeError, ValueError):
            continue
        slug = next((k for k, n in CITY_NAME.items() if n.lower() in (v.get('city') or '').lower()), None)
        if not slug or v['name'] in by_name:
            continue
        rev = v.get('tabelog_reviews')
        try:
            rev = int(str(rev).replace(',', ''))
        except (TypeError, ValueError):
            rev = None
        genre = v.get('genre') or ''
        fake = {'name': v['name'], 'genre': genre, 'price': v.get('price') or '', 'group': v.get('seats') or '',
                'why': v.get('notes') or '', 'tabelog': {'awards': v.get('awards') or ''}}
        row = {
            'id': f"{slug}/{v['name']}", 'city': CITY_NAME[slug], 'city_order': ORDER.index(slug),
            'on_route': slug in STAY, 'name': v['name'], 'name_ja': v.get('name_ja', ''),
            'area': v.get('area', ''), 'genre': genre, 'kind': kind_of(genre),
            'style': style_of(fake), 'meals': ' | '.join(meals_of(fake)),
            'tags': ' | '.join(['Checked this week'] + tags_of(fake, [], score, rev)),
            'price': v.get('price') or '', 'tabelog': score, 'reviews': rev,
            'awards': v.get('awards') or '', 'tabelog_url': v.get('tabelog_url') or '',
            'critics': '', 'critic_notes': '[]',
            'pregnancy': 'unknown', 'pregnancy_note': 'Not yet checked against her rules: ask for cooked dishes.',
            'tier': 'Group fit unverified', 'tier_note': '',
            'seven': 'unverified', 'group': ' · '.join(filter(None, [v.get('seats'), v.get('private_rooms')])),
            'open_on': 'Closing days: ' + (v.get('closed') or 'unverified'), 'open_count': 0,
            'hours_to_confirm': True, 'closed': v.get('closed') or '', 'dec_jan': v.get('hours') or '',
            'booking': v.get('reservations') or '', 'booking_channel': '',
            'why': v.get('notes') or '', 'order': '', 'source': 'Checked on Tabelog this week (' + v.get('status', '') + ')',
        }
        days_full = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        closed_txt = (v.get('closed') or '').lower().split('(')[0]
        cw = [WD[i] for i, w in enumerate(days_full) if w in closed_txt]
        if slug in STAY and 'on hold' not in closed_txt:
            opens = [x for x in STAY[slug] if WD[x.weekday()] not in cw and
                     not ('1 and 2 january' in closed_txt and x.isoformat() in ('2027-01-01', '2027-01-02'))]
            row['open_on'] = ', '.join(fmt_day(x) for x in opens)
            row['open_count'] = len(opens)
            row['closed'] = ('Closed ' + ', '.join(cw)) if cw else (v.get('closed') or '')
        sc = SCOUT.get(v['name'])
        if sc:
            row.update(tier=sc[0], kind=sc[1], pregnancy=sc[2], pregnancy_note=sc[3], tier_note=sc[4], booking=sc[4])
            if 'Ukihashi' in v['name']:
                row['meals'] = 'Lunch | Dinner'
            if 'Standing' in genre or 'standing' in (v.get('seats') or '').lower():
                row['tags'] += ' | Standing'
        places.append(row)
        added.append(row['name'])
        by_name[v['name']] = (slug, None, row)

places.sort(key=lambda r: (r['city_order'], r['name']))
print('places', len(places), 'added from scout:', added)

# ---------------- days (the concierge's day-by-day picks) ----------------
plan = json.load(open(os.path.join(REPO, 'plan-days.json')))['days']
TITLE = {x['date']: (x['kind'], x['title']) for x in plan}
CITY_OF = {}
for x in span('2026-12-20', '2027-01-09'):
    s = x.isoformat()
    CITY_OF[s] = ('Tokyo' if s <= '2026-12-23' or s >= '2027-01-07' else
                  'Nagano & Yudanaka' if s <= '2026-12-26' else
                  'Kanazawa' if s <= '2026-12-29' else
                  'Kyoto' if s <= '2027-01-03' else
                  'Nara & Kyoto' if s == '2027-01-04' else
                  'Kawaguchiko' if s <= '2027-01-06' else 'Tokyo')
CITY_OF['2026-12-27'] = 'Kanazawa'
CITY_OF['2026-12-30'] = 'Kyoto'
CITY_OF['2027-01-05'] = 'Kawaguchiko'
CITY_OF['2027-01-07'] = 'Tokyo'
CITY_OF['2026-12-24'] = 'Nagano & Yudanaka'

# slot, pick, place (name in the data, or None), why, fernanda, how
DAYS = {
 '2026-12-20': [
  ('Dinner', 'Okonomiyaki Kiji Marunouchi', 'Okonomiyaki Kiji Marunouchi',
   'Arrival night: by Tokyo Station, open every day, all cooked at the griddle, no booking.',
   'All cooked: easy.', 'Walk in; expect a short wait for seven.'),
  ('Dinner', 'Or a depachika picnic in the room', None,
   'If Fernanda wants to rest: Daimaru Tokyo B1 or GranSta bentō, eaten at the hotel.',
   'Pick cooked bentō; skip sashimi and soft-egg items.', 'No booking.'),
 ],
 '2026-12-21': [
  ('Breakfast', 'Torimeshi Torito Bunten', 'Torimeshi Torito Bunten',
   'The Tsukiji breakfast locals eat, from a chicken wholesaler. Monday is open.',
   'Torimeshi, not the oyakodon (its egg is half-raw).', 'Walk in from 8:30.'),
  ('Breakfast', 'Kitsuneya (for the adventurous)', 'Kitsuneya',
   'Offal simmered in Hatchō miso since 1947: market workers’ food.',
   'Simmered for hours: fine.', 'Queue; eat in shifts at the standing tables.'),
  ('Lunch', 'Narutomi', 'Narutomi',
   'Jūwari soba of rare precision, a short walk from Tsukiji. Mark Wiens called it one of his most amazing meals.',
   'Easy; skip tsukimi (raw egg).', 'Lunch without booking; ask for the table for six plus a chair, or split 4+3.'),
  ('Snack', 'Standing sushi for the sushi crew (optional)', 'Tachigui Sushi Akira (Shimbashi)',
   'If two or three want the counter experience: seven standing spots in Shimbashi, a short ride from Ginza. Monday is open.',
   'Not for Fernanda or the parents: standing, and raw fish.', 'Two or three people only; arrive early.'),
  ('Snack', 'Ginza department-store food hall', None,
   'The plan’s afternoon: the Ginza food halls for sweets and tomorrow’s breakfast.',
   'Almost everything is cooked; skip sashimi counters.', 'No booking.'),
  ('Dinner', 'Ningyōchō Imahan Honten', 'Ningyōchō Imahan Honten',
   'Family sukiyaki cooked at the table in a private room, after a 5 am start for the early crew. Open every day.',
   'Ask 「生卵なしで」 (no raw egg) and cook her beef longer, or order shabu-shabu.', 'Book a room for seven (rooms for 2–20).'),
 ],
 '2026-12-22': [
  ('Lunch', 'Ponta Honke', 'Ponta Honke',
   'The original katsuretsu, fried slowly in lard, right by the Ueno museums. Its 3rd-floor tatami room takes up to eight.',
   'Fried through: easy.', 'Book the room (from 2 people). Check it has chairs for the parents.'),
  ('Snack', 'Kayaba Coffee', 'Kayaba Coffee',
   'The plan’s seated break in Yanaka, in an old wooden house.',
   'The tamago sando is a cooked omelette: fine. One cup of coffee.', 'Book online; two tables (4+3).'),
  ('Dinner', 'Asakusa Oden Ōtafuku', 'Asakusa Oden Ōtafuku',
   'A hundred-year-old Kantō oden counter, after Skytree at dusk. Pure winter.',
   'All cooked: easy.', 'Book two rooms (4+3); rooms take 4–6.'),
 ],
 '2026-12-23': [
  ('Lunch', 'Tonkatsu Maisen Aoyama', 'Tonkatsu Maisen Aoyama Honten',
   'The plan’s lunch near the Nezu Museum, in an old bathhouse, with private rooms for eight. Tabelog 3.43: reliable, not a destination.',
   'Fried through: ask for hers well done.', 'Book a private room online (phone lines are closed).'),
  ('Dinner', 'Kagurazaka Ishikawa (the big night)', 'Kagurazaka Ishikawa',
   'Tokyo’s one ¥50k night: ten Tabelog Silvers in a row, and its 7-seat counter is exactly us. Wednesday is open.',
   'Say so when booking: cooked swaps for the sashimi and any shellfish.',
   'Book now if not done (the 18 Oct deadline has passed). Ask for the whole counter; room for 6 as plan B.'),
 ],
 '2026-12-24': [
  ('Breakfast', 'Ekiben at Tokyo Station', None,
   'Ekiben-ya Matsuri and GranSta inside the gates: buy seven different boxes and share on the shinkansen.',
   'Pick cooked boxes; skip raw-fish chirashi.', 'Buy 20–30 minutes before the train.'),
  ('Lunch', 'Ogawa no Shō Daimon (oyaki)', 'Ogawa no Shō Daimon',
   'Oyaki grilled on the irori, on the Zenkō-ji approach. Thursday is open.',
   'Fine.', 'Takeaway; no booking.'),
  ('Dinner', 'Christmas Eve kaiseki at the ryokan', None,
   'Set-time kaiseki at the inn.',
   'Tell the ryokan a week ahead: cooked swaps for sashimi and raw meat; a hard-boiled egg at breakfast.', 'Included.'),
 ],
 '2026-12-25': [
  ('Lunch', 'Iwamoto Sobaya', 'Iwamoto Sobaya',
   'The soba we can actually get in winter (Yama no Mi is shut for the snow). Friday is open.',
   'Fine.', 'Cash, by car. Seating is tatami: ask about chairs for the parents (unverified).'),
  ('Dinner', 'Christmas dinner at the ryokan', None, 'Set-time dinner at the inn.',
   'Same swaps as the 24th.', 'Included.'),
 ],
 '2026-12-26': [
  ('Snack', 'Sakurai Kanseidō (Obuse chestnut sweets)', None,
   'For the Obuse group: the chestnut sweet house on the 和菓子 EAST 百名店 2026 list.',
   'Fine.', 'Hours on 26 Dec to confirm.'),
  ('Dinner', 'Dinner at the ryokan', None, 'The last ryokan night.', 'Same swaps.', 'Included.'),
 ],
 '2026-12-27': [
  ('Lunch', 'Yamasan Sushi Honten', 'Yamasan Sushi Honten',
   'Arrival-day lunch at Ōmichō: kōbako crab and buri, with room for a group. No fixed closing day, so Sunday works.',
   'Boiled kōbako is fine; a few raw nigiri at most; no shellfish.', 'Book online (a few groups a day).'),
  ('Dinner', 'Akadama (oden)', 'Akadama Honten',
   'Sunday shuts Kabuna, Miyuki and Otome Zushi. Akadama, Kanazawa’s other classic oden house, is open (it closes Mondays).',
   'Oden is cooked; skip raw sides.', 'Book online; 96 seats, no private room, so ask for tables together. Cash only.'),
  ('Dinner', 'Or Turban Curry Honten', 'Turban Curry Honten',
   'The 1971 original Kanazawa curry: casual and quick.',
   'All cooked.', 'Walk in; 16 seats, so we’ll split.'),
 ],
 '2026-12-28': [
  ('Lunch', 'Lunch in Shirakawa-go', None,
   'No Shirakawa-go restaurant has been checked on Tabelog yet, so eat where it’s warm and seated.',
   'Hida beef only cooked through; no Hida beef sushi.', 'Unverified.'),
  ('Dinner', 'Otome Zushi (the crab dinner)', 'Otome Zushi',
   'Kanazawa’s historic sushi benchmark, on the last safe kōbako night. Bronze every year since 2020.',
   'Boiled kōbako is fine; ask ahead to swap raw shellfish and shirako for cooked pieces.',
   'Online booking opens 28 Oct, two months ahead. Ask for the tatami room (7 of 8) and whether it has chairs.'),
 ],
 '2026-12-29': [
  ('Breakfast', 'Ōmichō market stalls', None,
   'Ikiiki-tei is closed on Tuesdays, so: boiled crab, stall croquettes, and Yamasan if it’s open.',
   'Boiled crab and croquettes are fine; skip raw shellfish.', 'No booking.'),
  ('Snack', 'Tsubomi or Amanatto Kawamura (Higashi Chaya)', None,
   'Kanmi and candied beans in the teahouse lanes, both on the 和菓子 WEST 百名店 list.',
   'Fine.', 'Walk in.'),
  ('Lunch', 'Turban Curry Honten', 'Turban Curry Honten',
   'A quick, seated lunch before the gold-leaf workshop. It closes from 30 Dec, so today.',
   'All cooked.', 'Walk in; split.'),
  ('Dinner', 'Kabuna', 'Kabuna',
   'The local-cooking izakaya Tabelog reviewers return to for jibuni and seasonal crab. The best group dinner under ¥10k in town.',
   'Order the jibuni, crab and cooked dishes; skip raw shellfish and shirako.',
   'Book online; ask the room for six to take a seventh chair. Plan B: Oden Miyuki (rooms for 10–20).'),
 ],
 '2026-12-30': [
  ('Breakfast', 'Kanazawa station sweets and ekiben', None,
   'Suzume in the station for wagashi to take; ekiben for the train to Kyoto.',
   'Cooked boxes.', 'No booking.'),
  ('Lunch', 'Sōhonke Nishin Soba Matsuba', 'Sōhonke Nishin Soba Matsuba',
   'Herring soba where it was invented, by the river. The 30th is the easy day: the 31st queue is long.',
   'Fine.', 'Walk in.'),
  ('Snack', 'Nishiki Market', None,
   'Many shops close 1–3 Jan, so stock up today: Miki Keiran’s dashimaki, pickles, the ozōni makings.',
   'Dashimaki is cooked through; skip raw fish and skewers.', 'No booking.'),
  ('Snack', 'Izuu saba-zushi (takeaway)', 'Izuu',
   'Kyoto’s festive mackerel sushi since 1781, collected for tomorrow.',
   'Cured, not cooked: her call. Inari and anago are safe.', 'Phone from 8:00 on 28 Dec to order.'),
  ('Dinner', 'Pontochō Masuda', 'Pontochō Masuda',
   'The last normal restaurant night before New Year: obanzai platters, honest Kyoto home cooking.',
   'Almost all cooked; skip the kizushi.', 'Phone; book the private room for eight.'),
 ],
 '2026-12-31': [
  ('Breakfast', 'Smart Coffee', 'Smart Coffee',
   'Kyoto’s benchmark kissaten, open on New Year’s Eve. Pancakes and French toast.',
   'Fine; one coffee.', 'Walk in; two tables.'),
  ('Lunch', 'Kyō Udon Okakita', 'Kyō Udon Okakita',
   'Kyoto’s reference udon in Okazaki, open on the 31st. Soft noodles, clear kombu broth.',
   'Skip the oyakodon (soft egg) and the kasu-jiru (sake lees).', 'Walk in; seven together only off-peak.'),
  ('Dinner', 'Toshikoshi soba at home', None,
   'The New Year’s Eve soba, at the house before the Okera fire. Buy fresh soba at Nishiki or a depachika on the 30th.',
   'Fine.', 'No booking.'),
 ],
 '2027-01-01': [
  ('Breakfast', 'Inoda Coffee Honten', 'Inoda Coffee Honten',
   'A big old Kyoto coffee house that our notes list as open all year; 211 seats, so seven fit.',
   'Fine; one coffee.', 'Walk in. New Year hours are not on Tabelog: check the day before.'),
  ('Breakfast', 'Osechi and ozōni at the house', None,
   'The dead day: the osechi box ordered in November, and Kyoto’s white-miso ozōni.',
   'Most osechi is cooked; skip the raw items and anything with sake lees.', 'Order the osechi by 25 Nov.'),
  ('Lunch', 'A hotel restaurant lunch', None,
   'Almost every restaurant is shut. A hotel or ryokan restaurant is the plan.',
   'Ask for cooked dishes.', 'Book in early December; which hotel is unverified.'),
  ('Snack', 'Konbini', None, 'Open when nothing else is.', 'Nothing raw on the shelves.', 'No booking.'),
 ],
 '2027-01-02': [
  ('Lunch', 'Ukihashi (Hotel Granvia Kyoto)', 'Washoku Ukihashi (Hotel Granvia Kyoto)',
   'The plan’s kaiseki lunch with private rooms; it opened over New Year last year.',
   'Say so when booking: cooked swaps.', 'Book the room for eight online. New Year opening is not on Tabelog: confirm.'),
  ('Dinner', 'Daimaru Kyoto food hall', None,
   'The first depachika to reopen after New Year (2 Jan, to confirm).', 'Cooked bentō.', 'No booking.'),
 ],
 '2027-01-03': [
  ('Lunch', 'Nakamura Tōkichi Uji Honten', 'Nakamura Tōkichi Uji Honten',
   'Cha-soba and matcha sweets in a tea merchant’s house from 1859. Uji is packed on the 3rd, so go early.',
   'One matcha serving; hōjicha the rest of the day.', 'No bookings; 70 seats.'),
  ('Dinner', 'Takashimaya Kyoto food hall', None,
   'Reopens on 3 Jan: tsukemono, wagashi and ryōtei bentō.', 'Cooked bentō.', 'No booking.'),
 ],
 '2027-01-04': [
  ('Snack', 'Nakatanidō (yomogi-mochi)', 'Nakatanidō',
   'Warm mugwort mochi on Sanjō-dōri. The pounding is a show; the mochi is the real thing.',
   'Fine; small bites.', 'Walk in.'),
  ('Lunch', 'Awa Naramachi', 'Awa Naramachi',
   'The best sit-down meal in Nara for this family: calm, Yamato vegetables, a private room for 6–8.',
   'Almost everything is cooked.', 'Bookings only; book the private room.'),
  ('Lunch', 'Or Kamameshi Shizuka', 'Kamameshi Shizuka Koen-ten',
   'Rice cooked in an iron pot, near the park: the simpler Nara lunch. Monday is open (it closes Tuesdays).',
   'Cooked: fine.', 'Bookings unclear on Tabelog; tables and tatami.'),
  ('Snack', 'Kashiya (namagashi)', 'Kashiya',
   'Nara’s top-rated namagashi. The stairs are steep, so buy to take away.',
   'Fine; one matcha.', 'Phone bookings get priority.'),
  ('Dinner', 'Tempura Yoshikawa (Kyoto’s anchor)', 'Tempura Yoshikawa',
   'Serious tempura in a ryokan, with private rooms and a garden: the most comfortable fancy meal in Kyoto for all seven. Open on the 4th.',
   'Fine.', 'Bookings only; strict cancellation fee. Splurge alternative: Kikunoi Honten, if it has reopened.'),
 ],
 '2027-01-05': [
  ('Breakfast', 'Honke Daiichi Asahi', 'Honke Daiichi Asahi Honten',
   'The classic shōyu-tonkotsu bowl before a train, from 6:00, by Kyoto Station.',
   'Fine.', 'Queue; split 4+3.'),
  ('Lunch', 'Bentō from JR Kyoto Isetan B1', None, 'For the shinkansen to Mishima.', 'Cooked boxes.', 'No booking.'),
  ('Dinner', 'Dinner at the lake hotel', None, 'Nothing planned after a 4-hour move.', 'Tell the hotel.', 'Included or book with the hotel.'),
 ],
 '2027-01-06': [
  ('Lunch', 'Hoto Fudou', 'Hoto Fudo Kawaguchiko Kita Honten',
   'The plan’s hōtō lunch: thick noodles stewed with pumpkin in miso. Open daily; Kiji-tei and Miura Udon are shut on Wednesdays.',
   'Cooked: fine.', 'Walk in (bookings only for 10+). Cash only.'),
 ],
 '2027-01-07': [
  ('Lunch', 'Kiji-tei: only if the train moves', 'Kiji-tei',
   'Tabelog’s top Yamanashi hōtō, lunch only, and Thursday is its only open day while we’re here. It clashes with the morning Fuji Excursion.',
   'All cooked.', 'Book online, 9:00–10:00 on weekdays, if you move the train to the afternoon.'),
  ('Snack', 'Isetan Shinjuku food hall', None, 'The plan’s afternoon option: the city’s most complete depachika.',
   'Cooked bentō and sweets.', 'No booking.'),
  ('Dinner', 'Akasaka Shisen Hanten', 'Akasaka Shisen Hanten',
   'A chūka night: the Chen family made mapo tofu famous in Japan. Rooms for 4 to 30+.',
   'Easy.', 'Book a room; check its New Year break is over by the 7th.'),
 ],
 '2027-01-08': [
  ('Lunch', 'Sumiyaki Unafuji (eel)', 'Sumiyaki Unafuji Yurakucho',
   'Before Kabuki-za, a short walk from Ginza: charcoal-grilled eel, 百名店, and a room for eight.',
   'Eel is cooked; skip the liver (kimo).', 'Book the room online; set menus are booked ahead.'),
  ('Lunch', 'Or Tempura Fukamachi', 'Tempura Fukamachi',
   'An award every year since 2017, and lunch is half the dinner price.',
   'Fried: easy.', 'Book 7 of the 10 counter seats.'),
  ('Dinner', 'Restaurant Kamiya (farewell)', 'Restaurant Kamiya',
   'After the Tokyo National Museum: polished shitamachi yōshoku, 88 seats, semi-private. Friday is open.',
   'Menchi-katsu and hambāgu are fine; ask about the omurice egg.', 'Book; say seven.'),
 ],
 '2027-01-09': [
  ('Breakfast', 'Konbini or the hotel, then Haneda', None, 'Fly home.', 'Cooked.', 'No booking.'),
 ],
}

day_rows, problems = [], []
for date, items in DAYS.items():
    x = d(date)
    kind, title = TITLE.get(date, ('', ''))
    for i, (slot, pick, ref, why, her, how) in enumerate(items):
        row = {'key': f'{date}#{i}', 'date': date, 'day': fmt_day(x), 'city': CITY_OF[date],
               'plan_kind': kind, 'plan_title': title, 'slot': slot, 'pick': pick, 'why': why,
               'fernanda': her, 'how': how, 'tier': '', 'tabelog': None, 'reviews': None,
               'tabelog_url': '', 'place_id': '', 'check': ''}
        if ref:
            hit = by_name.get(ref)
            if not hit:
                row['check'] = 'Not yet checked on Tabelog'
            else:
                slug, p, prow = hit
                row.update(tier=prow['tier'], tabelog=prow['tabelog'], reviews=prow['reviews'],
                           tabelog_url=prow['tabelog_url'], place_id=prow['id'])
                if p is not None:
                    wd = WD[x.weekday()]
                    if wd in (p.get('closed_weekdays') or []) or date in (p.get('closed_dates') or []):
                        problems.append(f'{date} {pick}: closed that day')
                    if re.search(r'to confirm', p.get('dec_jan') or '', re.I):
                        row['check'] = 'Hours on our date to confirm'
        day_rows.append(row)

print('day rows', len(day_rows))
for pr in problems:
    print('PROBLEM:', pr)

# ---------------- deadlines (with the concierge's corrections) ----------------
dl = json.load(open(os.path.join(REPO, 'food-deadlines.json')))['deadlines']
FIX = {
    'food-ginza-hachigo': 'Ginza Hachigo: bookings for next week open at 9:00. It is closed Mondays, so aim for 22–23 Dec (or 7–8 Jan); book two seatings (4+3).',
    'food-sazenka-dec': 'Sazenka: see what is left on 22 or 23 Dec (closed Sundays and Mondays) and ask about seven.',
    'food-kanazawa-dinners': 'Book Kanazawa dinners for 28–29 Dec (Kabuna and Oden Miyuki are closed Sundays): Kabuna (room for 6, ask about seven) and Oden Miyuki (rooms for 10–20).',
    'food-soba-fujioka': 'Soba Fujioka (Nagano): booking opens a month ahead for lunch on 25 or 26 Dec. One table of six: it cannot take seven.',
    'food-kiji-tei': 'Kiji-tei (Kawaguchiko): lunch on Thu 7 Jan only, which clashes with the morning train. Book only if the train moves to the afternoon.',
}
CHANNEL_NOTE = {'food-kiji-tei': 'Online per the place data (the deadline said phone)',
                'food-kanazawa-dinners': 'Online per the place data (the deadline said phone)'}
deadlines = []
for x in dl:
    dd = d(x['date'])
    days_left = (dd - TODAY).days
    deadlines.append({
        'id': x['id'], 'date': x['date'], 'day': fmt_day(dd) + (' 2027' if dd.year == 2027 else ''),
        'item': FIX.get(x['id'], x['item']), 'how': CHANNEL_NOTE.get(x['id'], x.get('how', '')),
        'days_left': days_left,
        'status': 'Passed: check it’s booked' if days_left < 0 else ('This week' if days_left <= 7 else
                  'This month' if days_left <= 31 else 'Later'),
        'corrected': x['id'] in FIX,
    })
# Shirakawa / Otome lunch alternative is not a deadline; Otome dinner window stays 28 Oct.

# ---------------- dishes, areas, shops, know-how ----------------
dishes, areas, shops = [], [], []
for f in sorted(glob.glob(os.path.join(REPO, 'food-deep', '*.json'))):
    slug = os.path.basename(f)[:-5]
    if slug == 'photos':
        continue
    data = json.load(open(f))
    for m in data.get('meibutsu', []):
        dishes.append({'key': f"{slug}/{m['name']}", 'city': CITY_NAME[slug], 'city_order': ORDER.index(slug),
                       'on_route': slug in STAY, 'name': m['name'], 'name_ja': m.get('name_ja', ''),
                       'romaji': m.get('romaji', ''), 'what': m.get('what', ''), 'where': m.get('where', ''),
                       'must': bool(m.get('must')), 'pregnancy': m.get('pregnancy', ''),
                       'pregnancy_note': m.get('pregnancy_note', ''), 'price': m.get('price', '')})
    for a in data.get('areas', []):
        areas.append({'key': f"{slug}/{a['name']}", 'city': CITY_NAME[slug], 'city_order': ORDER.index(slug),
                      'on_route': slug in STAY, 'name': a['name'], 'name_ja': a.get('name_ja', ''),
                      'kind': a.get('kind', ''), 'glance': a.get('glance', ''), 'story': a.get('story', ''),
                      'eat': ' | '.join(a.get('eat') or []) if isinstance(a.get('eat'), list) else (a.get('eat') or ''),
                      'tips': ' | '.join(a.get('tips') or []) if isinstance(a.get('tips'), list) else (a.get('tips') or ''),
                      'dec_jan': a.get('dec_jan', '')})
    for s in data.get('shops', []):
        shops.append({'key': f"{slug}/{s['name']}", 'city': CITY_NAME[slug], 'city_order': ORDER.index(slug),
                      'on_route': slug in STAY, 'name': s['name'], 'name_ja': s.get('name_ja', ''),
                      'what': s.get('what', ''), 'buy': s.get('buy', ''), 'dec_jan': s.get('dec_jan', '')})

knowhow = []
TOPIC_LABEL = {'depachika': 'Depachika', 'konbini': 'Konbini', 'ekiben': 'Ekiben & stations',
               'etiquette': 'Manners', 'calendar': 'Calendar & New Year'}
for t, label in TOPIC_LABEL.items():
    data = json.load(open(os.path.join(REPO, 'food-deep', 'topics', t + '.json')))
    for si, s in enumerate(data['sections']):
        if t == 'calendar' and s['title'].startswith('Book by'):
            continue  # the deadlines dataset covers this
        if not s.get('items'):
            knowhow.append({'key': f'{t}/{si}/-', 'topic': label, 'section': s['title'], 'name': '',
                            'name_ja': '', 'what': s.get('body', ''), 'where': '', 'tip': '', 'price': ''})
            continue
        for ii, it in enumerate(s['items']):
            knowhow.append({'key': f'{t}/{si}/{ii}', 'topic': label, 'section': s['title'],
                            'name': it.get('name', ''), 'name_ja': it.get('name_ja', ''),
                            'what': it.get('what', ''), 'where': it.get('where', ''),
                            'tip': it.get('tip', ''), 'price': it.get('price', '')})
guide = json.load(open(os.path.join(REPO, 'food-guide.json')))
fh = guide['for_her']
for k in ('fine', 'careful', 'avoid'):
    for i, x in enumerate(fh[k]):
        knowhow.append({'key': f'for_her/{k}/{i}', 'topic': 'For Fernanda', 'section': k.capitalize(),
                        'name': '', 'name_ja': '', 'what': x, 'where': '', 'tip': '', 'price': ''})
knowhow.append({'key': 'for_her/summary', 'topic': 'For Fernanda', 'section': 'Summary', 'name': '',
                'name_ja': '', 'what': fh['summary'], 'where': '', 'tip': '', 'price': ''})
for i, h in enumerate(guide['how_we_eat']):
    knowhow.append({'key': f'how/{i}', 'topic': 'How we eat', 'section': h['title'], 'name': '', 'name_ja': '',
                    'what': h['text'], 'where': '', 'tip': '', 'price': ''})

for name, rows in [('places', places), ('days', day_rows), ('deadlines', deadlines), ('dishes', dishes),
                   ('areas', areas), ('shops', shops), ('knowhow', knowhow)]:
    path = os.path.join(OUT, f'guide_{name}.json')
    json.dump(rows, open(path, 'w'), ensure_ascii=False)
    print(f'{name:10s} rows={len(rows):4d} bytes={os.path.getsize(path):7d}')

if problems:
    sys.exit(1)
