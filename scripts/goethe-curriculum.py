#!/usr/bin/env python3
"""Build the official Goethe A2/B1 curriculum overlay.

The official PDFs remain the source of truth. The B1 CSV is a mechanical
extraction of the official alphabetical section and is cross-checked against
the downloaded PDF. The script never translates content: it only extracts,
normalises and matches entries, then prepares a queue for a separate ChatGPT
translation pass.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import pdfplumber


ROOT = Path(__file__).resolve().parent.parent
A2_PDF = ROOT / "tmp/pdfs/goethe-a2.pdf"
B1_PDF = ROOT / "tmp/pdfs/goethe-b1.pdf"
B1_CSV = ROOT / "tmp/pdfs/b1-reference.csv"
B1_SORTED = ROOT / "tmp/pdfs/b1-sorted-reference.txt"
NICO_CARDS = ROOT / "src/data/nicosWegCards.ts"
SOURCE_OUTPUT = ROOT / "data/goetheOfficialSource.json"
QUEUE_OUTPUT = ROOT / "data/goetheTranslationQueue.json"
REMAINING_OUTPUT = ROOT / "data/goetheTranslationRemaining.json"

GOETHE_A2_URL = (
    "https://www.goethe.de/pro/relaunch/prf/en/"
    "Goethe-Zertifikat_A2_Wortliste.pdf"
)
GOETHE_B1_URL = (
    "https://www.goethe.de/pro/relaunch/prf/en/"
    "Goethe-Zertifikat_B1_Wortliste.pdf"
)

# Group-list entries are printed outside the alphabetical A2 section. They are
# deliberately represented as learnable words, not as typographic examples
# such as "1,50 m" or a particular calendar date.
A2_GROUP_HEADWORDS = [
    "ca.", "d. h.", "ICE", "Lkw", "PC", "SMS", "usw.", "WC", "z. B.",
    "der Antwortbogen, -", "die Aufgabe, -n", "das Beispiel, -e",
    "die Durchsage, -n", "die Lösung, -en", "markieren", "der Prüfer, -",
    "die Prüferin, -nen", "die Prüfung, -en", "der Punkt, -e",
    "der Teil, -e", "der Test, -s", "der Text, -e", "das Wörterbuch, ¨-er",
    "der Angestellte, -n", "die Angestellte, -n", "der Arzt, ¨-e",
    "die Ärztin, -nen", "der Auszubildende, -n", "die Auszubildende, -n",
    "der Autor, -en", "die Autorin, -nen", "der Babysitter, -",
    "die Babysitterin, -nen", "der Bäcker, -", "die Bäckerin, -nen",
    "der Doktor, -en", "die Doktorin, -nen", "der Fahrer, -",
    "die Fahrerin, -nen", "der Friseur, -e", "die Friseurin, -nen",
    "der Handwerker, -", "die Handwerkerin, -nen", "der Hausmann, ¨-er",
    "die Hausfrau, -en", "der Journalist, -en", "die Journalistin, -nen",
    "der Kaufmann, Kaufleute", "die Kauffrau, -en", "der Kellner, -",
    "die Kellnerin, -nen", "der Koch, ¨-e", "die Köchin, -nen",
    "der Krankenpfleger, -", "die Krankenschwester, -n", "der Künstler, -",
    "die Künstlerin, -nen", "der Lehrer, -", "die Lehrerin, -nen",
    "der Mechaniker, -", "die Mechanikerin, -nen", "das Model, -s",
    "der Musiker, -", "die Musikerin, -nen", "der Polizist, -en",
    "die Polizistin, -nen", "der Rentner, -", "die Rentnerin, -nen",
    "der Sänger, -", "die Sängerin, -nen", "der Schauspieler, -",
    "die Schauspielerin, -nen", "der Techniker, -", "die Technikerin, -nen",
    "der Verkäufer, -", "die Verkäuferin, -nen",
    "der Bruder, ¨-", "der Cousin, -s", "die Cousine, -n",
    "die Eltern (Pl.)", "der Enkel, -", "die Enkelin, -nen",
    "die Geschwister (Pl.)", "die Großeltern (Pl.)", "die Großmutter, ¨-",
    "der Großvater, ¨-", "das Kind, -er", "die Mutter, ¨-", "der Onkel, -",
    "die Schwester, -n", "der Sohn, ¨-e", "die Tante, -n", "die Tochter, ¨-",
    "der Vater, ¨-", "der Verwandte, -n", "die Verwandte, -n",
    "ledig", "verheiratet", "getrennt", "geschieden",
    "blau", "braun", "gelb", "grau", "grün", "lila", "orange", "rosa",
    "rot", "schwarz", "weiß", "der Norden", "der Süden", "der Osten",
    "der Westen",
    "Deutschland", "deutsch", "der Deutsche, -n", "die Deutsche, -n",
    "Österreich", "österreichisch", "der Österreicher, -",
    "die Österreicherin, -nen", "die Schweiz", "schweizerisch",
    "der Schweizer, -", "die Schweizerin, -nen", "Luxemburg",
    "luxemburgisch", "der Luxemburger, -", "die Luxemburgerin, -nen",
    "Europa", "europäisch", "der Europäer, -", "die Europäerin, -nen",
    "das Abitur", "der Direktor, -en", "die Direktorin, -nen",
    "die Hausaufgabe, -n", "die Klasse, -n", "die Klassenfahrt, -en",
    "das Sekretariat, -e", "der Stundenplan, ¨-e", "die Biologie",
    "die Chemie", "Deutsch", "Englisch", "Französisch", "die Geografie",
    "die Geschichte", "die Kunst", "Latein", "die Mathematik", "die Musik",
    "die Physik", "die Religion", "die Sozialkunde", "der Sport",
    "der Euro, -", "der Cent, -", "der Franken, -", "der Rappen, -",
    "der Meter, -", "der Zentimeter, -", "der Kilometer, -",
    "das Prozent, -e", "der Liter, -", "das Gramm, -", "das Kilogramm, -",
    "das Grad Celsius",
    "der Karneval", "Ostern", "Weihnachten", "Neujahr", "Silvester",
    "der Frühling", "das Frühjahr", "der Sommer", "der Herbst", "der Winter",
    "der Januar", "der Februar", "der März", "der April", "der Mai",
    "der Juni", "der Juli", "der August", "der September", "der Oktober",
    "der November", "der Dezember", "der Tag, -e", "der Morgen, -",
    "der Vormittag, -e", "der Mittag, -e", "der Nachmittag, -e",
    "der Abend, -e", "die Nacht, ¨-e", "die Mitternacht", "täglich",
    "tagsüber", "morgens", "vormittags", "mittags", "nachmittags", "abends",
    "nachts",
    "der Montag", "der Dienstag", "der Mittwoch", "der Donnerstag",
    "der Freitag", "der Samstag", "der Sonntag", "das Wochenende, -n",
    "der Arbeitstag, -e", "der Werktag, -e", "der Feiertag, -e",
    "die Sekunde, -n", "die Minute, -n", "die Stunde, -n", "die Woche, -n",
    "das Jahr, -e",
    "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht",
    "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn",
    "sechzehn", "siebzehn", "achtzehn", "neunzehn", "zwanzig", "dreißig",
    "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig",
    "hundert", "tausend", "die Million, -en", "erstens", "zweitens",
    "drittens",
]


def normalise_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u00ad", "")).strip()


def match_keys(headword: str) -> set[str]:
    """Return stable lemma candidates for matching cards and list entries."""
    value = normalise_spaces(headword.replace("\n", " / "))
    value = re.sub(r"\s*→.*$", "", value)
    keys: set[str] = set()

    # Capture every explicitly marked noun, including male/female pairs.
    for match in re.finditer(
        r"\b(?:der|die|das)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+)",
        value,
    ):
        keys.add(match.group(1))

    first = re.split(r"[,;/]", value, maxsplit=1)[0]
    first = re.sub(r"^(?:der|die|das)\s+", "", first, flags=re.I)
    first = re.sub(r"^\((?:sich)\)\s+", "", first, flags=re.I)
    first = re.sub(
        r"^(?:sich|etwas|jemandem|jemanden|jemand|jdn\.|etw\.)\s+",
        "",
        first,
        flags=re.I,
    )
    first = re.sub(r"\([^)]*\)", "", first)
    first = normalise_spaces(first)
    if first:
        keys.add(first)

    result = set()
    for key in keys:
        key = key.lower().replace("…", " ")
        key = re.sub(r"[^a-zäöüß0-9]+", " ", key)
        key = normalise_spaces(key)
        if key:
            result.add(key)
    return result


def primary_key(headword: str) -> str:
    keys = match_keys(headword)
    if not keys:
        return ""
    # Prefer the first written lemma over a later paired noun.
    value = normalise_spaces(headword.replace("\n", " "))
    first = re.split(r"[,;/]", value, maxsplit=1)[0]
    first = re.sub(r"^(?:der|die|das)\s+", "", first, flags=re.I)
    first = re.sub(r"^\((?:sich)\)\s+", "", first, flags=re.I)
    first = re.sub(
        r"^(?:sich|etwas|jemandem|jemanden|jemand|jdn\.|etw\.)\s+",
        "",
        first,
        flags=re.I,
    )
    first = re.sub(r"\([^)]*\)", "", first).lower()
    first = re.sub(r"[^a-zäöüß0-9]+", " ", first)
    first = normalise_spaces(first)
    return first if first in keys else sorted(keys)[0]


def load_nicos_cards() -> list[dict[str, Any]]:
    source = NICO_CARDS.read_text(encoding="utf-8")
    match = re.search(r"JSON\.parse\((.*)\) as CardContent\[\];", source)
    if not match:
        raise RuntimeError("Could not read generated Nicos Weg cards.")
    return json.loads(json.loads(match.group(1)))


def line_groups(page: pdfplumber.page.Page) -> list[dict[str, Any]]:
    words = page.extract_words(x_tolerance=1, y_tolerance=2)
    groups: list[dict[str, Any]] = []
    for word in words:
        target = next(
            (line for line in groups if abs(line["top"] - word["top"]) <= 1.2),
            None,
        )
        if target is None:
            target = {"top": word["top"], "words": []}
            groups.append(target)
        target["words"].append(word)
    for line in groups:
        line["words"].sort(key=lambda item: item["x0"])
    return sorted(groups, key=lambda item: item["top"])


def column_text(line: dict[str, Any], x_min: float, x_max: float) -> str:
    words = [
        word["text"]
        for word in line["words"]
        if word["x0"] >= x_min and word["x0"] < x_max
    ]
    return normalise_spaces(" ".join(words))


def extract_a2_alphabetical() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with pdfplumber.open(A2_PDF) as pdf:
        for page_number in range(7, 31):
            page = pdf.pages[page_number]
            for head_min, head_max, example_min, example_max in [
                (30, 104, 104, 292),
                (300, 373, 373, 565),
            ]:
                column_rows: list[dict[str, str]] = []
                for line in line_groups(page):
                    if line["top"] < 105 or line["top"] > 780:
                        continue
                    head = column_text(line, head_min, head_max)
                    example = column_text(line, example_min, example_max)
                    if not head and not example:
                        continue
                    if head in {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Z"}:
                        continue
                    if not column_rows:
                        if head:
                            column_rows.append(
                                {
                                    "headword": head,
                                    "exampleGerman": example,
                                    "page": str(page_number + 1),
                                }
                            )
                        continue

                    previous = column_rows[-1]
                    wrapped_headword = (
                        previous["headword"].endswith("-")
                        and not re.search(r",\s*-$", previous["headword"])
                        and not re.search(r"[.!?…][\"”']?$", previous["exampleGerman"])
                    )
                    head_continuation = bool(head) and (
                        previous["headword"].endswith((",", "/", "(", "hat/ist"))
                        or wrapped_headword
                        or head.startswith(
                            (
                                "hat ",
                                "ist ",
                                "sind ",
                                "wird ",
                                "gibt ",
                                "geht ",
                                "kommt ",
                                "nimmt ",
                                "sieht ",
                                "spricht ",
                                "zieht ",
                                "fängt ",
                                "fährt ",
                                "hält ",
                                "lässt ",
                                "läuft ",
                                "liest ",
                                "schlägt ",
                                "schließt ",
                                "trägt ",
                                "trifft ",
                                "wäscht ",
                                "weiß ",
                                "(",
                            )
                        )
                    )
                    if not head or head_continuation:
                        if head:
                            previous["headword"] = normalise_spaces(
                                f"{previous['headword']} {head}"
                            )
                        if example:
                            previous["exampleGerman"] = normalise_spaces(
                                f"{previous['exampleGerman']} {example}"
                            )
                        continue

                    column_rows.append(
                        {
                            "headword": head,
                            "exampleGerman": example,
                            "page": str(page_number + 1),
                        }
                    )
                rows.extend(column_rows)

    return [
        row
        for row in rows
        if row["headword"] not in {"ALPHABETISCHER", "WORTSCHATZ"}
    ]


def assert_pdf_identity() -> None:
    with pdfplumber.open(A2_PDF) as pdf:
        a2_text = "\n".join((page.extract_text() or "") for page in pdf.pages[:4])
        if "GOETHE-ZERTIFIKAT A2" not in a2_text or len(pdf.pages) != 32:
            raise RuntimeError("Unexpected A2 PDF.")
    with pdfplumber.open(B1_PDF) as pdf:
        b1_text = "\n".join((page.extract_text() or "") for page in pdf.pages[:5])
        if "ZERTIFIKAT B1" not in b1_text or len(pdf.pages) != 104:
            raise RuntimeError("Unexpected B1 PDF.")


def load_b1_entries() -> list[dict[str, str]]:
    with B1_CSV.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))
    if not rows or "Goethe Zertifikat B1 Wortliste" not in rows[0][0]:
        raise RuntimeError("Unexpected B1 extraction.")
    entries = [
        {
            "headword": normalise_spaces(row[0]),
            "exampleGerman": normalise_spaces(row[1]) if len(row) > 1 else "",
            "page": "",
        }
        for row in rows[1:]
        if row and normalise_spaces(row[0])
    ]

    # A second independently generated transcription catches a small number of
    # group-list items omitted from the alphabetical CSV.
    known = {key for entry in entries for key in match_keys(entry["headword"])}
    for line in B1_SORTED.read_text(encoding="utf-8").splitlines():
        headword = normalise_spaces(line)
        keys = match_keys(headword)
        if headword and keys and keys.isdisjoint(known):
            entries.append({"headword": headword, "exampleGerman": "", "page": ""})
            known.update(keys)
    return entries


def source_id(headword: str) -> str:
    digest = hashlib.sha1(headword.encode("utf-8")).hexdigest()[:12]
    return f"goethe-{digest}"


def build_source() -> dict[str, Any]:
    assert_pdf_identity()
    a2_alpha = extract_a2_alphabetical()
    a2_group_entries = [
        {"headword": item, "exampleGerman": "", "page": "5–7"}
        for item in A2_GROUP_HEADWORDS
    ]
    a2_all = a2_alpha + a2_group_entries
    a2_keys = {key for entry in a2_all for key in match_keys(entry["headword"])}

    official: list[dict[str, Any]] = []
    seen_primary: set[str] = set()
    # B1 is cumulative and supplies the clean alphabetical catalogue. The A2
    # alphabetical extraction is used to label its A2 subset, while only A2
    # word-group items absent from the B1 alphabetical list are appended.
    for entry in load_b1_entries() + a2_group_entries:
        primary = primary_key(entry["headword"])
        if not primary or primary in seen_primary:
            continue
        keys = match_keys(entry["headword"])
        level = "A2" if not keys.isdisjoint(a2_keys) else "B1"
        official.append(
            {
                "id": source_id(primary),
                "headword": entry["headword"],
                "exampleGerman": entry["exampleGerman"],
                "goetheLevel": level,
                "sourceUrl": GOETHE_A2_URL if level == "A2" else GOETHE_B1_URL,
                "matchKeys": sorted(keys),
            }
        )
        seen_primary.add(primary)

    nicos = load_nicos_cards()
    card_keys: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in nicos:
        for key in match_keys(card["german"]):
            card_keys[key].append(card)

    matched_card_levels: dict[str, str] = {}
    matched_entry_ids: set[str] = set()
    for entry in official:
        matched_cards = {
            card["id"]: card
            for key in entry["matchKeys"]
            for card in card_keys.get(key, [])
        }
        if not matched_cards:
            continue
        matched_entry_ids.add(entry["id"])
        for card_id in matched_cards:
            previous = matched_card_levels.get(card_id)
            if previous != "A2":
                matched_card_levels[card_id] = entry["goetheLevel"]

    missing = [entry for entry in official if entry["id"] not in matched_entry_ids]
    result = {
        "version": 1,
        "generatedFrom": {
            "goetheA2": GOETHE_A2_URL,
            "goetheB1": GOETHE_B1_URL,
            "a2PdfPages": 32,
            "b1PdfPages": 104,
        },
        "stats": {
            "a2AlphabeticalEntries": len(a2_alpha),
            "a2ReferenceEntries": sum(
                entry["goetheLevel"] == "A2" for entry in official
            ),
            "b1ReferenceEntries": sum(
                entry["goetheLevel"] == "B1" for entry in official
            ),
            "officialEntries": len(official),
            "matchedOfficialEntries": len(matched_entry_ids),
            "matchedNicosCards": len(matched_card_levels),
            "missingOfficialEntries": len(missing),
        },
        "matchedCardLevels": matched_card_levels,
        "entries": official,
        "missingEntries": missing,
    }
    return result


def write_outputs(source: dict[str, Any]) -> None:
    SOURCE_OUTPUT.write_text(
        json.dumps(source, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    queue = {
        "instructions": (
            "Translate only these missing official Goethe entries. Keep every id "
            "unchanged. German must be natural and learner-facing."
        ),
        "expectedEntries": len(source["missingEntries"]),
        "entries": [
            {
                "id": entry["id"],
                "headword": entry["headword"],
                "exampleGerman": entry["exampleGerman"],
                "goetheLevel": entry["goetheLevel"],
                "sourceUrl": entry["sourceUrl"],
            }
            for entry in source["missingEntries"]
        ],
    }
    QUEUE_OUTPUT.write_text(
        json.dumps(queue, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    translated_ids: set[str] = set()
    for path in sorted((ROOT / "data").glob("goetheTranslations-[0-9][0-9][0-9].json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        translated_ids.update(
            entry["id"]
            for entry in payload.get("translations", [])
            if isinstance(entry, dict) and isinstance(entry.get("id"), str)
        )
    remaining = {
        "instructions": queue["instructions"],
        "expectedEntries": sum(
            entry["id"] not in translated_ids for entry in queue["entries"]
        ),
        "entries": [
            entry for entry in queue["entries"] if entry["id"] not in translated_ids
        ],
    }
    REMAINING_OUTPUT.write_text(
        json.dumps(remaining, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    source = build_source()
    write_outputs(source)
    print(json.dumps(source["stats"], ensure_ascii=False, indent=2))
    print(f"source={SOURCE_OUTPUT}")
    print(f"queue={QUEUE_OUTPUT}")
    print(f"remaining={REMAINING_OUTPUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        raise
