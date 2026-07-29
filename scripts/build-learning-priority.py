#!/usr/bin/env python3
"""Build a pedagogical order for new Goethe cards.

The source lists are alphabetical, so their position is not a useful teaching
sequence. This script combines CEFR level, contemporary German frequency,
form complexity, part of speech and high-confidence morphological relations.
It only orders new cards; due reviews remain controlled by the SRS.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median
from typing import Any

from wordfreq import zipf_frequency


ROOT = Path(__file__).resolve().parent.parent
CARDS_PATH = ROOT / "src/data/goetheCards.ts"
OUTPUT_PATH = ROOT / "data/goetheLearningPriorities.json"

CATEGORY_ORDER = [
    "Codzienność i problemy (Alltag und Probleme)",
    "Życie i relacje (Leben und Beziehungen)",
    "Dom i mieszkanie (Wohnen und Haushalt)",
    "Jedzenie i zakupy (Essen und Einkaufen)",
    "Podróże i miasto (Reisen und Stadt)",
    "Zdrowie i bezpieczeństwo (Gesundheit und Sicherheit)",
    "Edukacja i język (Bildung und Sprache)",
    "Praca i kariera (Arbeit und Karriere)",
    "Finanse i usługi (Geld und Dienstleistungen)",
    "Czas wolny i sport (Freizeit und Sport)",
    "Technologia i komunikacja (Technik und Kommunikation)",
    "Emocje i opinie (Gefühle und Meinungen)",
    "Przyroda i środowisko (Natur und Umwelt)",
    "Kultura i media (Kultur und Medien)",
    "Społeczeństwo i polityka (Gesellschaft und Politik)",
    "Plany i przyszłość (Pläne und Zukunft)",
    "Historia i życie w Niemczech (Geschichte und Leben in Deutschland)",
]

PLACEHOLDERS = {
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen",
    "einem", "einer", "sich", "etwas", "jemand", "jemanden", "jemandem",
    "jdn", "etw", "man", "sein", "seine", "seinen", "seiner",
}
PREPOSITIONS = {
    "an", "auf", "aus", "bei", "durch", "für", "gegen", "hinter", "in",
    "mit", "nach", "neben", "ohne", "über", "um", "unter", "von", "vor",
    "zu", "zwischen",
}
FUNCTION_WORDS = PREPOSITIONS | {
    "aber", "also", "auch", "beide", "bis", "da", "dann", "darum", "dass",
    "dein", "denn", "deshalb", "doch", "dort", "du", "er", "es", "etwas",
    "euer", "ganz", "hier", "ich", "ihr", "immer", "ja", "jede", "kein",
    "man", "mehr", "mein", "nicht", "noch", "nur", "oder", "schon", "seit",
    "sie", "so", "sondern", "sonst", "uns", "unser", "was", "wenn", "wer",
    "wie", "wir", "wo", "zu", "und",
}
NON_VERB_WORDS = {
    "abends", "außen", "gestern", "hinten", "innen", "mitten", "morgen",
    "morgens", "oben", "unten", "vorn",
}
ABSTRACT_SUFFIXES = (
    "heit", "keit", "ung", "schaft", "ismus", "tion", "tät", "nis",
    "tum", "ment", "anz", "enz",
)
DERIVATIONAL_SUFFIXES = (
    "innen", "erin", "in", "er", "heit", "keit", "ung", "lich", "isch",
    "bar", "los", "voll", "schaft", "tion", "tät", "nis", "ment",
)
KNOWN_PREFIXES = (
    "ab", "an", "auf", "aus", "be", "bei", "dar", "durch", "ein", "ent",
    "er", "fest", "fort", "frei", "ge", "her", "hin", "los", "mit",
    "nach", "nieder", "statt", "teil", "uber", "um", "un", "unter", "ver",
    "vor", "weg", "weiter", "wider", "wieder", "zer", "zu", "zuruck",
    "zusammen",
)
KNOWN_SUFFIXES = (
    "e", "en", "er", "erin", "in", "innen", "heit", "keit", "ung", "lich",
    "ig", "isch", "bar", "los", "sam", "schaft", "tion", "tat", "nis",
    "ment",
)
DENIED_RELATIONS = {
    ("hassen", "hasslich"),
}


def read_cards() -> list[dict[str, Any]]:
    source = CARDS_PATH.read_text(encoding="utf-8")
    match = re.search(r"JSON\.parse\((.*)\) as CardContent\[\];", source)
    if not match:
        raise RuntimeError("Could not read generated Goethe cards.")
    return json.loads(json.loads(match.group(1)))


def fold(value: str) -> str:
    return (
        value.lower()
        .replace("ä", "a")
        .replace("ö", "o")
        .replace("ü", "u")
        .replace("ß", "ss")
    )


def tokens(card: dict[str, Any]) -> list[str]:
    value = re.sub(r"\([^)]*\)", " ", card["german"])
    all_tokens = re.findall(r"[A-Za-zÄÖÜäöüß]+", value)
    lexical = [
        token
        for token in all_tokens
        if token.lower() not in PLACEHOLDERS
        and (len(all_tokens) == 1 or token.lower() not in PREPOSITIONS)
    ]
    return lexical or all_tokens


def part_of_speech(card: dict[str, Any], lexical: list[str]) -> str:
    word = lexical[-1].lower() if lexical else card["german"].lower()
    if len(lexical) == 1 and word in FUNCTION_WORDS:
        return "function"
    if card.get("article"):
        return "noun"
    if lexical and lexical[0][:1].isupper():
        return "noun"
    if word in {"sein", "tun"} or (
        word not in NON_VERB_WORDS and word.endswith(("en", "ern", "eln"))
    ):
        return "verb"
    if len(lexical) > 1:
        return "phrase"
    if word.endswith(("ig", "lich", "isch", "bar", "los", "sam")):
        return "adjective"
    return "other"


def main_lexeme(card: dict[str, Any], lexical: list[str], pos: str) -> str:
    if not lexical:
        return fold(card["german"])
    if pos == "noun":
        return fold(max(lexical, key=len))
    verb_candidates = [
        token for token in lexical if token.lower().endswith(("en", "ern", "eln"))
    ]
    if verb_candidates:
        return fold(verb_candidates[-1])
    return fold(max(lexical, key=len))


def stem(value: str, pos: str) -> str:
    result = fold(value)
    suffixes = (
        (
            "innen", "erin", "in", "heit", "keit", "ung", "schaft",
            "tion", "tat", "nis", "ment",
        )
        if pos == "noun"
        else ("lich", "isch", "ig", "bar", "los", "sam")
        if pos == "adjective"
        else ("ern", "eln", "en")
        if pos == "verb"
        else ()
    )
    for suffix in suffixes:
        if result.endswith(suffix) and len(result) - len(suffix) >= 4:
            result = result[: -len(suffix)]
            break
    if pos == "verb" and result.endswith("en") and len(result) > 6:
        result = result[:-2]
    elif pos == "noun" and result.endswith("e") and len(result) > 5:
        result = result[:-1]
    return result


def form_set(value: str, pos: str) -> set[str]:
    original = fold(value)
    return {original, stem(original, pos)}


def frequency_score(card: dict[str, Any], lexical: list[str]) -> float:
    if not lexical:
        return 0.0
    phrase = " ".join(lexical).lower()
    phrase_frequency = zipf_frequency(phrase, "de")
    token_frequencies = [zipf_frequency(token.lower(), "de") for token in lexical]
    if len(lexical) == 1:
        return round(token_frequencies[0], 3)
    constituent_frequency = median(token_frequencies) - 0.28 * (len(lexical) - 1)
    return round(max(phrase_frequency, constituent_frequency), 3)


def complexity_score(
    card: dict[str, Any],
    lexical: list[str],
    pos: str,
    lexeme: str,
) -> float:
    compact_length = len(re.sub(r"[^A-Za-zÄÖÜäöüß]", "", card["german"]))
    score = max(0, compact_length - 7) * 0.045
    score += max(0, len(lexical) - 1) * 0.34
    if "(" in card["german"]:
        score += 0.18
    if pos == "phrase":
        score += 0.16
    if pos == "noun" and lexeme.endswith(ABSTRACT_SUFFIXES):
        score += 0.28
    if pos == "noun" and len(lexeme) >= 13:
        score += 0.25
    if pos == "noun" and len(lexeme) >= 18:
        score += 0.35
    if re.search(r"\b[A-ZÄÖÜ]{2,}\b", card["german"]):
        score += 0.3
    return round(score, 3)


def learning_band(
    card: dict[str, Any],
    frequency: float,
    complexity: float,
    pos: str,
) -> int:
    level = card.get("goetheLevel") or card.get("level")
    if level == "A2" and frequency >= 4.2 and complexity <= 0.85:
        band = 1
    elif level == "A2":
        band = 2
    elif frequency >= 4.75 and complexity <= 0.9:
        band = 2
    elif frequency >= 3.45 and complexity <= 1.45:
        band = 3
    else:
        band = 4
    if frequency < 2.4 or complexity >= 2.0:
        band = min(5, band + 1)
    # At A2 the most basic connectors and pronouns are usually already known.
    # They remain in the official curriculum, but should not crowd out concrete
    # verbs and nouns at the start of a category.
    if pos == "function":
        band = max(2, band)
    return band


def base_priority(pos: str) -> int:
    return {
        "verb": 0,
        "noun": 1,
        "adjective": 2,
        "other": 3,
        "phrase": 4,
        "function": 5,
    }[pos]


def relation_candidates(
    item: dict[str, Any],
    category_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    target = item["lexeme"]
    target_forms = form_set(target, item["partOfSpeech"])
    target_stem = min(target_forms, key=len)
    eligible = [
        candidate
        for candidate in category_items
        if candidate["id"] != item["id"]
        and candidate["partOfSpeech"] in {"noun", "verb", "adjective"}
    ]
    candidate_forms = {
        candidate["id"]: form_set(candidate["lexeme"], candidate["partOfSpeech"])
        for candidate in eligible
    }
    matches: list[tuple[int, dict[str, Any]]] = []
    for candidate in category_items:
        if candidate["id"] == item["id"]:
            continue
        if candidate["partOfSpeech"] not in {"noun", "verb", "adjective"}:
            continue
        base = candidate["lexeme"]
        base_forms = candidate_forms[candidate["id"]]
        base_stem = min(base_forms, key=len)
        if len(base_stem) < 4:
            continue
        if candidate["frequencyZipf"] + 0.5 < item["frequencyZipf"]:
            continue
        if (base, target) in DENIED_RELATIONS:
            continue

        strength = 0
        shared_forms = {
            form
            for form in target_forms.intersection(base_forms)
            if len(form) >= 4
        }
        if shared_forms and len(target) - len(base) >= 2:
            strength = 5
        elif (
            item["partOfSpeech"] == "noun"
            and len(target_stem) - len(base_stem) >= 3
        ):
            for base_form in sorted(base_forms, key=len, reverse=True):
                if len(base_form) < 4 or not target.startswith(base_form):
                    continue
                if any(
                    other_id != candidate["id"]
                    and any(
                        len(other_form) >= 4 and target.endswith(other_form)
                        for other_form in other_forms
                    )
                    for other_id, other_forms in candidate_forms.items()
                ):
                    strength = 3
                    break
        if strength:
            matches.append((strength, candidate))
    return sorted(
        matches,
        key=lambda match: (
            -match[0],
            -len(stem(match[1]["lexeme"], match[1]["partOfSpeech"])),
            match[1]["band"],
            -match[1]["frequencyZipf"],
        ),
    )


def relation_type(item: dict[str, Any], base: dict[str, Any]) -> str:
    if item["partOfSpeech"] == "noun" and len(item["lexeme"]) >= len(base["lexeme"]) + 5:
        return "compound"
    return "derived"


def effective_key(item: dict[str, Any]) -> tuple[float, ...]:
    frequency_penalty = max(0.0, 7.0 - item["frequencyZipf"])
    relation_penalty = 0.35 if item.get("relationBaseId") else 0.0
    explicit_role = item.get("explicitRole")
    role_penalty = {"base": -0.2, "derived": 0.25, "compound": 0.4}.get(
        explicit_role,
        relation_penalty,
    )
    return (
        item["band"],
        round(frequency_penalty + item["complexity"] * 0.22 + role_penalty, 4),
        base_priority(item["partOfSpeech"]),
        item["sourceOrder"],
        item["id"],
    )


def arrange_category(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {item["id"]: item for item in items}
    children: dict[str, list[str]] = defaultdict(list)
    indegree = {item["id"]: 0 for item in items}
    for item in items:
        base_id = item.get("relationBaseId")
        if base_id in by_id:
            children[base_id].append(item["id"])
            indegree[item["id"]] += 1

    remaining = set(by_id)
    available = {item_id for item_id, count in indegree.items() if count == 0}
    arranged: list[dict[str, Any]] = []
    recent_relations: list[str] = []
    recent_surfaces: list[str] = []
    recent_pos: list[str] = []

    while remaining:
        if not available:
            # A defensive escape hatch for an accidental morphology cycle.
            available.add(min(remaining, key=lambda item_id: effective_key(by_id[item_id])))
        candidates = sorted((by_id[item_id] for item_id in available), key=effective_key)
        chosen = candidates[0]
        top_band = chosen["band"]
        chosen_metric = effective_key(chosen)[1]
        chosen_surface_repeats = fold(chosen["lexeme"]) in recent_surfaces[-12:]
        if chosen_surface_repeats:
            for candidate in candidates[1:]:
                if candidate["band"] != top_band:
                    break
                if (
                    fold(candidate["lexeme"]) not in recent_surfaces[-12:]
                    and (
                        candidate.get("relationBaseId")
                        or stem(candidate["lexeme"], candidate["partOfSpeech"])
                    )
                    not in recent_relations[-5:]
                ):
                    chosen = candidate
                    chosen_metric = effective_key(chosen)[1]
                    break
        for candidate in candidates[1:]:
            if candidate["band"] != top_band:
                break
            if effective_key(candidate)[1] > chosen_metric + 1.35:
                break
            relation_key = candidate.get("relationBaseId") or stem(
                candidate["lexeme"],
                candidate["partOfSpeech"],
            )
            surface_key = fold(candidate["lexeme"])
            repeats_relation = relation_key in recent_relations[-5:]
            repeats_surface = surface_key in recent_surfaces[-12:]
            repeats_pos = (
                (
                    candidate["partOfSpeech"] == "function"
                    and recent_pos[-1:] == ["function"]
                )
                or (
                    len(recent_pos) >= 2
                    and recent_pos[-1] == recent_pos[-2] == candidate["partOfSpeech"]
                )
            )
            chosen_relation = chosen.get("relationBaseId") or stem(
                chosen["lexeme"],
                chosen["partOfSpeech"],
            )
            chosen_repeats = (
                chosen_relation in recent_relations[-5:]
                or fold(chosen["lexeme"]) in recent_surfaces[-12:]
                or (
                    (
                        chosen["partOfSpeech"] == "function"
                        and recent_pos[-1:] == ["function"]
                    )
                    or (
                        len(recent_pos) >= 2
                        and recent_pos[-1] == recent_pos[-2] == chosen["partOfSpeech"]
                    )
                )
            )
            if (
                chosen_repeats
                and not repeats_relation
                and not repeats_surface
                and not repeats_pos
            ):
                chosen = candidate
                break

        arranged.append(chosen)
        chosen_id = chosen["id"]
        remaining.remove(chosen_id)
        available.remove(chosen_id)
        recent_relations.append(
            chosen.get("relationBaseId")
            or stem(chosen["lexeme"], chosen["partOfSpeech"])
        )
        recent_surfaces.append(fold(chosen["lexeme"]))
        recent_pos.append(chosen["partOfSpeech"])
        for child_id in children.get(chosen_id, []):
            indegree[child_id] -= 1
            if indegree[child_id] == 0:
                available.add(child_id)

    return spread_duplicate_surfaces(arranged)


def spread_duplicate_surfaces(
    arranged: list[dict[str, Any]],
    minimum_gap: int = 8,
) -> list[dict[str, Any]]:
    """Keep duplicate source entries out of the same short learning batch.

    The Goethe and Nicos sources intentionally overlap. We retain both records
    (their translations or examples may differ), but do not show an identical
    prompt twice within a typical six-card introduction.
    """

    result = list(arranged)
    for index in range(len(result)):
        surface = fold(result[index]["lexeme"])
        previous = next(
            (
                earlier
                for earlier in range(index - 1, max(-1, index - minimum_gap), -1)
                if fold(result[earlier]["lexeme"]) == surface
            ),
            None,
        )
        if previous is None:
            continue

        positions = {item["id"]: position for position, item in enumerate(result)}
        duplicate_id = result[index]["id"]
        duplicate_children = {
            item["id"]
            for item in result
            if item.get("relationBaseId") == duplicate_id
        }
        replacement_index = None
        for later in range(index + 1, len(result)):
            candidate = result[later]
            candidate_surface = fold(candidate["lexeme"])
            if candidate["band"] > result[index]["band"] + 1:
                break
            if candidate_surface in {
                fold(item["lexeme"])
                for item in result[max(0, index - minimum_gap + 1) : index]
            }:
                continue
            base_id = candidate.get("relationBaseId")
            if base_id and positions.get(base_id, index) >= index:
                continue
            if any(
                result[position]["id"] in duplicate_children
                for position in range(index + 1, later + 1)
            ):
                continue
            replacement_index = later
            break

        if replacement_index is not None:
            replacement = result.pop(replacement_index)
            result.insert(index, replacement)

    return result


def main() -> None:
    cards = read_cards()
    core = [card for card in cards if card.get("curriculumTier") == "core"]
    category_rank = {category: index for index, category in enumerate(CATEGORY_ORDER)}
    source_order_by_id = {card["id"]: index for index, card in enumerate(cards)}
    items: list[dict[str, Any]] = []

    for card in core:
        lexical = tokens(card)
        pos = part_of_speech(card, lexical)
        lexeme = main_lexeme(card, lexical, pos)
        frequency = frequency_score(card, lexical)
        complexity = complexity_score(card, lexical, pos, lexeme)
        items.append(
            {
                "id": card["id"],
                "category": card["category"],
                "categoryOrder": category_rank.get(card["category"], 999),
                "goetheLevel": card.get("goetheLevel"),
                "lexeme": lexeme,
                "partOfSpeech": pos,
                "frequencyZipf": frequency,
                "complexity": complexity,
                "band": learning_band(card, frequency, complexity, pos),
                "sourceOrder": source_order_by_id[card["id"]],
                "explicitRole": card.get("wordFamilyRole"),
                "explicitPrerequisiteIds": card.get("prerequisiteIds", []),
            }
        )

    by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        by_category[item["category"]].append(item)

    relations = 0
    for category_items in by_category.values():
        by_id = {item["id"]: item for item in category_items}
        for item in category_items:
            explicit = [
                by_id[base_id]
                for base_id in item["explicitPrerequisiteIds"]
                if base_id in by_id
            ]
            raw_candidates = explicit or relation_candidates(item, category_items)
            candidates = [
                candidate[1] if isinstance(candidate, tuple) else candidate
                for candidate in raw_candidates
            ]
            if not candidates:
                continue
            base = candidates[0]
            item["relationBaseId"] = base["id"]
            item["relationType"] = (
                item["explicitRole"]
                if item["explicitRole"] in {"derived", "compound"}
                else relation_type(item, base)
            )
            relations += 1

    output_entries: list[dict[str, Any]] = []
    for category in sorted(
        by_category,
        key=lambda value: (category_rank.get(value, 999), value),
    ):
        arranged = arrange_category(by_category[category])
        for learning_order, item in enumerate(arranged):
            output_entries.append(
                {
                    "id": item["id"],
                    "category": category,
                    "categoryOrder": item["categoryOrder"],
                    "learningOrder": learning_order,
                    "goetheLevel": item["goetheLevel"],
                    "band": item["band"],
                    "frequencyZipf": item["frequencyZipf"],
                    "complexity": item["complexity"],
                    "partOfSpeech": item["partOfSpeech"],
                    **(
                        {
                            "relationBaseId": item["relationBaseId"],
                            "relationType": item["relationType"],
                        }
                        if item.get("relationBaseId")
                        else {}
                    ),
                }
            )

    band_counts = Counter(entry["band"] for entry in output_entries)
    result = {
        "version": 1,
        "method": {
            "frequency": "wordfreq 3.1.1, German Zipf frequency",
            "principles": [
                "routine A2 vocabulary before less useful vocabulary",
                "high-frequency and shorter forms before rare and complex forms",
                "base forms before high-confidence derivatives and compounds",
                "limited spacing of the same morphological family and part of speech",
                "SRS due reviews always remain ahead of new cards",
            ],
            "categoryOrder": CATEGORY_ORDER,
        },
        "stats": {
            "cards": len(output_entries),
            "automaticOrExplicitRelations": relations,
            "bands": {str(key): band_counts[key] for key in sorted(band_counts)},
            "minimumFrequencyZipf": min(entry["frequencyZipf"] for entry in output_entries),
            "maximumFrequencyZipf": max(entry["frequencyZipf"] for entry in output_entries),
        },
        "entries": output_entries,
    }
    OUTPUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result["stats"], ensure_ascii=False, indent=2))
    print(f"output={OUTPUT_PATH}")


if __name__ == "__main__":
    main()
