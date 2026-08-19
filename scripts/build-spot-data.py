"""OpenStreetMap から、24時間営業の店舗・施設を取り出す。

出典: OpenStreetMap contributors（ODbL 1.0） https://www.openstreetmap.org/copyright

このリポジトリには以前、「alert seed 1」といった架空の項目と、収益計画や
技術選定といった運営側のメモが入っており、それが公開されていた。すべて捨てて、
出典をたどれる実在の店舗だけを載せる。

拾うのは opening_hours が "24/7"（年中無休24時間）と書かれているものだけ。
「22時まで」のような表記は解釈が分かれるため扱わない。コンビニは数が多く、
深夜に開いているのが当たり前なので対象から外している。

使い方: python scripts/build-spot-data.py src/spots.json
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'scripts' / '.cache'

OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
]
UA = 'midnight-spot-data/1.0 (+https://midnightspot.jp)'
DELAY = 4.0

PREFECTURES = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県',
    '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県',
    '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府',
    '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県',
    '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県',
    '鹿児島県', '沖縄県',
]

# 左のタグに当たったものを、右の分類で扱う。上から順に判定する。
KINDS = [
    (('amenity', 'public_bath'), '銭湯・サウナ'),
    (('amenity', 'internet_cafe'), 'ネットカフェ'),
    (('amenity', 'restaurant'), '飲食店'),
    (('amenity', 'fast_food'), '飲食店'),
    (('amenity', 'cafe'), 'カフェ'),
    (('shop', 'supermarket'), 'スーパー'),
    (('shop', 'chemist'), 'ドラッグストア'),
    (('shop', 'laundry'), 'コインランドリー'),
    (('amenity', 'fuel'), 'ガソリンスタンド'),
    (('leisure', 'fitness_centre'), 'ジム'),
    (('amenity', 'karaoke_box'), 'カラオケ'),
]

QUERY = """
[out:json][timeout:300];
area["name"="{prefecture}"]["admin_level"="4"]->.pref;
(
  nwr["opening_hours"="24/7"]["amenity"~"^(public_bath|internet_cafe|restaurant|fast_food|cafe|fuel|karaoke_box)$"]["name"](area.pref);
  nwr["opening_hours"="24/7"]["shop"~"^(supermarket|chemist|laundry)$"]["name"](area.pref);
  nwr["opening_hours"="24/7"]["leisure"="fitness_centre"]["name"](area.pref);
);
out tags center;
"""

DENY_NAME = re.compile('跡$|跡地|予定地')


def fetch(prefecture: str) -> list[dict]:
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f'spots-{PREFECTURES.index(prefecture):02d}.json'

    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))

    body = urllib.parse.urlencode({'data': QUERY.format(prefecture=prefecture)}).encode()
    payload = None
    last_error = None

    for attempt in range(8):
        endpoint = OVERPASS_ENDPOINTS[attempt % len(OVERPASS_ENDPOINTS)]
        request = urllib.request.Request(endpoint, data=body, headers={'User-Agent': UA})

        try:
            with urllib.request.urlopen(request, timeout=320) as response:
                payload = json.loads(response.read().decode('utf-8', 'replace'))
            break
        except Exception as error:
            last_error = error
            wait = DELAY * (attempt + 1)
            print(f'  {prefecture}: {error} のため {wait:.0f} 秒待って別のサーバで再試行します', flush=True)
            time.sleep(wait)

    if payload is None:
        raise RuntimeError(f'取得できませんでした: {last_error}')

    # 24時間営業の店が1軒も無い県は考えにくいが、0件でもそのまま残す
    # （東京都のような大きい県で0件なら、次の実行で取り直せるよう記録だけしておく）
    path.write_text(json.dumps(payload['elements'], ensure_ascii=False), encoding='utf-8')
    time.sleep(DELAY)

    return payload['elements']


def kind_of(tags: dict) -> str | None:
    for (key, value), name in KINDS:
        if tags.get(key) == value:
            return name

    return None


def main() -> None:
    output = Path(sys.argv[1])
    spots = []

    for prefecture in PREFECTURES:
        try:
            elements = fetch(prefecture)
        except Exception as error:
            print(f'{prefecture} の取得に失敗しました: {error}', flush=True)
            continue

        added = 0

        for element in elements:
            tags = element.get('tags', {})
            name = (tags.get('name') or '').strip()
            kind = kind_of(tags)

            if not name or kind is None or DENY_NAME.search(name):
                continue

            center = element.get('center') or element
            lat, lng = center.get('lat'), center.get('lon')

            if lat is None or lng is None:
                continue

            spots.append({
                'name': name,
                'kind': kind,
                'area': prefecture,
                'city': tags.get('addr:city'),
                'brand': tags.get('brand') or tags.get('operator'),
                'phone': tags.get('phone') or tags.get('contact:phone'),
                'website': tags.get('website') or tags.get('contact:website'),
                'lat': round(float(lat), 7),
                'lng': round(float(lng), 7),
                'sourceRef': f"{element['type']}/{element['id']}",
            })
            added += 1

        print(f'{prefecture} {added}件', flush=True)

    spots.sort(key=lambda spot: (spot['area'], spot['kind'], spot['name']))

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        'confirmedOn': date.today().isoformat(),
        'sourceLabel': 'OpenStreetMap contributors（ODbL 1.0）',
        'sourceUrl': 'https://www.openstreetmap.org/copyright',
        'kinds': sorted({name for _, name in KINDS}),
        'spots': spots,
    }, ensure_ascii=False), encoding='utf-8')

    print(f'{len(spots)}件を書き出しました')


main()
