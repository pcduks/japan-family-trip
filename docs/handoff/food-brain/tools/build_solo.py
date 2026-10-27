"""Pedro's solo Tokyo week (Mon 26 – Fri 30 Oct 2026), based in Shibuya.

Candidates come from the vetted Tokyo data plus the scout's solo_shibuya.json.
For each meal slot, lists every candidate that is open that day, with distance
band from Shibuya, Tabelog, price, booking route and the concierge's pick order.
Writes solo.json (dashboard dataset) and the spreadsheet.
"""
import datetime as dt
import json
import os
import re
import sys

SCRATCH = '/tmp/claude-0/-home-user-japan-family-trip/e34b5d0a-646d-57b0-84f9-185e40f9f4c1/scratchpad'
OUT = os.path.join(SCRATCH, 'solo')
TOKYO = '/home/user/japan-family-trip/v2/data/food-deep/tokyo.json'
WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
WD_FULL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

SLOTS = [
    (dt.date(2026, 10, 26), 'Dinner'),
    (dt.date(2026, 10, 27), 'Dinner'),
    (dt.date(2026, 10, 28), 'Dinner'),
    (dt.date(2026, 10, 29), 'Dinner'),
    (dt.date(2026, 10, 30), 'Lunch'),
]

# Distance bands from Shibuya Station. Approximate, from the map, not timed.
BANDS = [
    ('In Shibuya (walk)', r'shibuya|shinsen|tomigaya|okushibu|udagawa|dogenzaka|jinnan|sakuragaoka'),
    ('One stop (Ebisu, Daikanyama, Nakameguro, Omotesandō)', r'ebisu|daikanyama|nakameguro|naka-meguro|omotesand|jingūmae|jingumae|harajuku|aoyama|gaiemmae'),
    ('Short cab, 10–15 min', r'meguro|nishi-azabu|nishiazabu|hiroo|minami-azabu|shirokane|roppongi|azabu|akasaka'),
    ('Cross-town cab, 20–35 min', r'ginza|kyōbashi|kyobashi|hanzōmon|hanzomon|ichibanch|kagurazaka|nihonbashi|tsukiji|monzen|fukuzumi|kanda|ichigaya|ningyōch|hatchōbori|asakusa|ueno|negishi|minami-asagaya'),
    ('Far: 35 min+', r'adachi|shikahama|minami-senju|sumida|mukōjima|itabashi|tsukishima|kachidoki'),
]
BAND_ORDER = {b: i for i, (b, _) in enumerate(BANDS)}


def band(area):
    a = (area or '').lower()
    for label, rx in BANDS:
        if re.search(rx, a):
            return label
    return 'Distance unverified'


# Tokyo places that make sense for one person, with the concierge's solo notes.
# (name in tokyo.json, solo note, which slots it suits)
FROM_DATA = {
    'Toriyoshi Nakameguro': ('Walk in at 16:00 for a counter seat; one person is the easy case.', 'dinner'),
    'Tonkatsu Tonki (Meguro)': ('Online booking is for groups of 4+; solo, you walk in to the long counter. Opens 16:00. Closed the 3rd Monday (26 Oct is the 4th, so open).', 'dinner'),
    'Tempura Motoyoshi': ('Book online. 4.06 in Daikanyama, one stop from Shibuya. Counter tempura where solo is normal.', 'dinner'),
    'Butagumi Nishi-Azabu': ('Tonkatsu by pork breed in an old house; tables, so solo is easy. Booking route unverified.', 'dinner'),
    'Myōjaku': ('The splurge: an 8-seat counter at ¥50–60k. A week out, only a cancellation; solo makes that much likelier.', 'dinner'),
    'Sazenka': ('Tabelog’s top Chinese (4.59). Very hard; try a cancellation for one, once.', 'dinner'),
    'Shichubo Yung': ('Fuchsia Dunlop’s Tokyo pick: Chinese at a 10-seat counter. Book online.', 'dinner'),
    'Sushi Mizukami': ('8-seat counter, sittings 17:30 and 19:30, on Tabelog. Solo seats free up more often than pairs.', 'dinner'),
    'Sushi Arai': ('The top bookable sushi (4.59). Watch Tabelog daily for a cancelled single seat.', 'dinner'),
    'Tonkatsu Narikura': ('Six seats at the counter: made for one. Bookings only. Far west, about 30 min by cab or the Chūō line.', 'dinner'),
    'Yakiniku Jumbo Shirokane': ('Takes bookings; whether it seats one is unverified, so ask when booking.', 'dinner'),
    'Kagurazaka Ishikawa': ('Ten Silvers in a row. 7-seat counter; a cancellation for one is the only way in a week out.', 'dinner'),
    'Ginza Hachigo': ('Lunch only (11:00–16:00). Bookings for next week opened Sat 24 Oct at 9:00 on the shop’s own channel; otherwise walk in from 11:00 (bookings get priority from 12:00).', 'lunch'),
    'Tonkatsu Maisen Aoyama Honten': ('The safe Aoyama lunch: tonkatsu in an old bathhouse, no stress for one.', 'lunch'),
    'Tempura Fukamachi': ('Lunch at half the dinner price; 10-seat counter. Book.', 'lunch'),
    'Narutomi': ('Jūwari soba; lunch without a booking on weekdays.', 'lunch'),
}

# The concierge's order for each slot (names must exist among candidates; missing ones are skipped).
PICKS = {
    '2026-10-26': ['Sushi Yuu Tsubasa', 'Sumibi Yaki Yuji', 'Tempura Kitagawa', 'Shibuya Morimoto'],
    '2026-10-27': ['CHIKAMINE', 'Tempura Motoyoshi', 'Koutarou', 'Sumibi Yaki Yuji'],
    '2026-10-28': ['Sumibi Yaki Yuji', 'Koutarou', 'Uogashi Fukuchan 2 gou ten', 'Tonkatsu Narikura'],
    '2026-10-29': ['Kirin', 'Sakai Shokai', 'Tamawarai', 'Sushi Mizukami'],
    '2026-10-30': ['Hayashi', 'Tamawarai', 'Tonkatsu Koko Made Yaru Ka.', 'Sushi Kuriyagawa'],
}


def txt(v):
    if isinstance(v, list):
        return '; '.join(str(x) for x in v)
    return '' if v is None else str(v)


def closed_days_from_text(text):
    text = txt(text)
    t = (text or '').lower().split('(')[0]
    return {WD[i] for i, w in enumerate(WD_FULL) if w in t} | set(re.findall(r'\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b', text or ''))


def money(price):
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


cands = {}
tokyo = {p['name']: p for p in json.load(open(TOKYO))['places']}
validated = {}
vpath = os.path.join(SCRATCH, 'validated.json')
if os.path.exists(vpath):
    validated = {v['name']: v for v in json.load(open(vpath))}

for name, (note, suits) in FROM_DATA.items():
    p = tokyo.get(name)
    if p:
        tab = p.get('tabelog') or {}
        cands[name] = {
            'name': name, 'name_ja': p.get('name_ja', ''), 'area': p.get('area', '').replace('Tokyo · ', ''),
            'genre': p.get('genre', ''), 'tabelog': tab.get('score'), 'reviews': tab.get('reviews'),
            'awards': tab.get('awards', ''), 'url': tab.get('url', ''), 'price': p.get('price', ''),
            'closed': set(p.get('closed_weekdays') or []), 'closed_dates': set(p.get('closed_dates') or []),
            'closed_known': 'closed_weekdays' in p, 'booking': p.get('booking', ''), 'note': note,
            'suits': suits, 'source': 'Trip research (Tabelog, 18 Oct)',
        }
    elif name in validated:
        v = validated[name]
        cands[name] = {
            'name': name, 'name_ja': v.get('name_ja', ''), 'area': v.get('area', ''), 'genre': v.get('genre', ''),
            'tabelog': float(v['tabelog_score']), 'reviews': int(str(v.get('tabelog_reviews') or 0).replace(',', '')) or None,
            'awards': txt(v.get('awards')), 'url': v.get('tabelog_url') or '', 'price': v.get('price') or '',
            'closed': closed_days_from_text(v.get('closed')), 'closed_dates': set(), 'closed_known': True,
            'booking': txt(v.get('reservations')), 'note': note, 'suits': suits,
            'source': 'Checked on Tabelog, 19 Oct',
        }
    else:
        print('missing from data:', name)

# Closing days and meal fit for the scout's places, set by hand from each Tabelog report
# (its free-text 'closed' field also names the open days, so it can't be parsed).
SCOUT_META = {
    'CHIKAMINE': ({'Sun', 'Mon'}, 'dinner', 'Book online; the owner posts openings on Instagram. Tabelog tags it solo-friendly. Two seatings, 17:00 and 20:30.'),
    'Tempura Kitagawa': ({'Sun'}, 'dinner', 'Reservation only, on Tabelog or LINE. Michelin Tokyo 2026 selected. One of the few top tempura counters open on Monday. No very casual clothes.'),
    'Sushi Yuu Tsubasa': ({'Tue', 'Wed'}, 'dinner', 'Books one person on Tabelog. On 24 Oct it showed one seat on the 26th at 20:00: book now if you want it. ¥15,000 course; 2-hour sitting; no perfume.'),
    'Sushi Kuriyagawa': ({'Sun', 'Mon'}, 'both', 'Book on Tabelog. Lunch Wed–Sat 12:00. 100% cancellation fee the day before. Solo booking not stated.'),
    'Eiki': ({'Sun'}, 'dinner', 'Elite yakitori, but booked through the 食オク auction site: a long shot. Also closes two unnamed days a month.'),
    'Kirin': (set(), 'dinner', 'Book on Tabelog; yakitori à la carte at the counter suits one (the mizutaki course needs two). 5% service charge.'),
    'Shibuya Morimoto': ({'Sun'}, 'dinner', 'Walk in from 16:00; no bookings; cash only. Old-school counter that Mark Wiens filmed in 2017.'),
    'Sumibi Yaki Yuji': ({'Sun'}, 'dinner', 'Bookings need two people, so walk in near the 16:00 opening for a counter seat. Cash only.'),
    'Koutarou': ({'Mon'}, 'dinner', 'Book online (opens a month ahead). Closes the 1st and 3rd Tuesday; 27 Oct is the 4th, so open. 10-seat counter.'),
    'Sakai Shokai': ({'Sun'}, 'dinner', 'Book online. Sake-led counter, 11 seats. Open on Monday.'),
    'Uogashi Fukuchan 2 gou ten': ({'Sat', 'Sun'}, 'dinner', 'Standing bar, walk in from 16:00; it sells out, so go early. Cash only.'),
    'Tonkatsu Koko Made Yaru Ka.': ({'Wed', 'Sun'}, 'both', 'Book online; at lunch a booking skips the queue. 8-seat counter. Cards and QR only, no cash.'),
    'Hayashi': ({'Wed', 'Sun'}, 'lunch', 'Queue before the 11:30 opening; it closes when sold out. Cash only. The top ramen in Shibuya.'),
    'Chuka Menten Kiraku': ({'Wed'}, 'both', 'Walk in, 11:30–20:30 non-stop; cash only. A Shibuya institution and an easy early dinner.'),
    'Tamawarai': ({'Sun', 'Mon', 'Tue'}, 'both', 'Dinner is booking-only (online); weekday lunch is walk-in until the soba runs out. Closes for the buckwheat harvest in October and November on dates not given: check before going. Cash only.'),
    'Udon Yamacho': (set(), 'both', 'Open every day; dinner bookable online; a ¥3,500 course is offered to one person on the day.'),
}

# Scout results for this week.
spath = os.path.join(SCRATCH, 'solo_shibuya.json')
scout_names = []
if os.path.exists(spath):
    for v in json.load(open(spath)):
        try:
            score = float(v.get('tabelog_score'))
        except (TypeError, ValueError):
            continue
        hours = (v.get('hours') or '').lower()
        suits = 'both'
        if not re.search(r'1[7-9]:|2[0-3]:|dinner|夜', hours) and hours:
            suits = 'lunch'
        elif not re.search(r'1[01]:|1[2-4]:\d\d|lunch|昼', hours) and hours:
            suits = 'dinner'
        rv = v.get('tabelog_reviews')
        try:
            rv = int(str(rv).replace(',', ''))
        except (TypeError, ValueError):
            rv = None
        name = v['name']
        meta = SCOUT_META.get(name)
        if meta is None:
            print('scout place without meta, skipped:', name)
            continue
        cands[name] = {
            'name': name, 'name_ja': v.get('name_ja', ''), 'area': ' · '.join(filter(None, [v.get('area'), v.get('station')])),
            'genre': v.get('genre', ''), 'tabelog': score, 'reviews': rv, 'awards': txt(v.get('awards')),
            'url': v.get('tabelog_url') or '',
            'price': ' · '.join(filter(None, [('Dinner ' + v['price_dinner']) if v.get('price_dinner') and v['price_dinner'] != 'unverified' else '',
                                              ('Lunch ' + v['price_lunch']) if v.get('price_lunch') and v['price_lunch'] != 'unverified' else ''])),
            'closed': closed_days_from_text(v.get('closed')), 'closed_dates': set(), 'closed_known': bool(v.get('closed')) and v.get('closed') != 'unverified',
            'booking': txt(v.get('reservations')), 'note': txt(v.get('notes')), 'suits': suits,
            'source': 'Checked on Tabelog this week (' + (v.get('status') or '') + ')',
            'solo_ok': txt(v.get('solo_ok')), 'hours': txt(v.get('hours')), 'counter': txt(v.get('counter')),
        }
        cands[name].update(closed=meta[0], closed_known=True, suits=meta[1], note=meta[2])
        scout_names.append(name)

rows = []
for date, meal in SLOTS:
    iso = date.isoformat()
    wd = WD[date.weekday()]
    order = PICKS.get(iso, [])
    for name, c in cands.items():
        if meal == 'Dinner' and c['suits'] == 'lunch':
            continue
        if meal == 'Lunch' and c['suits'] == 'dinner':
            continue
        is_open = wd not in c['closed'] and iso not in c['closed_dates']
        if not is_open:
            continue
        b = 'One stop (Ebisu, Daikanyama, Nakameguro, Omotesandō)' if name == 'Tamawarai' else band(c['area'])
        rank = order.index(name) + 1 if name in order else None
        m = money(c['price'])
        rows.append({
            'key': f'{iso}|{name}', 'date': iso, 'day': f"{wd} {date.day} Oct", 'meal': meal,
            'pick': ('Top pick' if rank == 1 else f'Option {rank}') if rank else '',
            'rank': rank or 99,
            'name': name, 'name_ja': c['name_ja'], 'genre': c['genre'], 'area': c['area'],
            'distance': b, 'distance_order': BAND_ORDER.get(b, 9),
            'tabelog': c['tabelog'], 'reviews': c['reviews'], 'awards': c['awards'], 'tabelog_url': c['url'],
            'price': c['price'], 'price_top': m,
            'booking': c['booking'], 'note': c['note'],
            'closed_days': ', '.join(sorted(c['closed'], key=WD.index)) if c['closed_known'] and c['closed'] else ('None listed' if c['closed_known'] else 'Unverified'),
            'source': c['source'],
        })
rows.sort(key=lambda r: (r['date'], r['rank'], r['distance_order'], -(r['tabelog'] or 0)))

problems = []
for iso, names in PICKS.items():
    for n in names:
        if n in cands and not any(r['date'] == iso and r['name'] == n for r in rows):
            problems.append(f'{iso}: pick {n} is closed or wrong meal')

json.dump(rows, open(os.path.join(OUT, 'solo.json'), 'w'), ensure_ascii=False)
print('candidates', len(cands), 'scout:', len(scout_names), 'rows', len(rows))
for p in problems:
    print('PROBLEM', p)
for iso in PICKS:
    print(iso, [(r['pick'], r['name'], r['distance'][:12]) for r in rows if r['date'] == iso and r['pick']])
if problems:
    sys.exit(1)
