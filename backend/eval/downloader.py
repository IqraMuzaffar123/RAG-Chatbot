"""Dataset downloader for RAG evaluation benchmarks.

Downloads and caches 50 questions from each of 3 public QA datasets:
- SQuAD 2.0 (answerable questions only)
- Natural Questions (short answers with context, with synthetic fallback)
- HotpotQA (fullwiki, multi-hop reasoning)
"""

import json
import random
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

SAMPLE_SIZE = 50
SEED = 42
DATASETS_DIR = Path(__file__).parent / "datasets"


def _ensure_datasets_dir() -> None:
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# SQuAD 2.0
# ---------------------------------------------------------------------------

def download_squad() -> list[dict]:
    """Download SQuAD 2.0 validation split, keep answerable Qs, sample 50.

    Caches result to backend/eval/datasets/squad.json.
    """
    cache_path = DATASETS_DIR / "squad.json"
    if cache_path.exists():
        logger.info("Loading SQuAD from cache: %s", cache_path)
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    logger.info("Downloading SQuAD 2.0 from HuggingFace …")
    from datasets import load_dataset  # type: ignore

    ds = load_dataset("rajpurkar/squad_v2", split="validation")

    # Keep only answerable questions (non-empty answer list)
    answerable = [
        ex for ex in ds
        if ex["answers"]["text"]  # non-empty list of answer strings
    ]

    rng = random.Random(SEED)
    sampled = rng.sample(answerable, min(SAMPLE_SIZE, len(answerable)))

    result = [
        {
            "question": ex["question"],
            "context": ex["context"],
            "ground_truth": ex["answers"]["text"][0],
        }
        for ex in sampled
    ]

    _ensure_datasets_dir()
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info("SQuAD: saved %d questions to %s", len(result), cache_path)
    return result


# ---------------------------------------------------------------------------
# Natural Questions
# ---------------------------------------------------------------------------

def _nq_fallback() -> list[dict]:
    """Generate 50 synthetic NQ-style questions from general knowledge."""
    logger.warning("Using synthetic fallback for Natural Questions dataset.")

    synthetic = [
        {
            "question": "What is the capital of France?",
            "context": "France is a country in Western Europe. Its capital and largest city is Paris, which has been the country's capital since the late 10th century.",
            "ground_truth": "Paris",
        },
        {
            "question": "Who wrote Romeo and Juliet?",
            "context": "Romeo and Juliet is a tragedy written by William Shakespeare early in his career, about two young star-crossed lovers whose deaths ultimately reconcile their feuding families.",
            "ground_truth": "William Shakespeare",
        },
        {
            "question": "What is the chemical symbol for gold?",
            "context": "Gold is a chemical element with the symbol Au (from Latin: aurum) and atomic number 79. It is a bright, slightly orange-yellow, dense, soft, malleable, and ductile metal.",
            "ground_truth": "Au",
        },
        {
            "question": "In what year did World War II end?",
            "context": "World War II, also known as the Second World War, was a global conflict lasting from 1939 to 1945. It ended with the surrender of Germany in May 1945 and Japan in September 1945.",
            "ground_truth": "1945",
        },
        {
            "question": "What is the largest planet in our solar system?",
            "context": "Jupiter is the fifth planet from the Sun and the largest in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets combined.",
            "ground_truth": "Jupiter",
        },
        {
            "question": "Who painted the Mona Lisa?",
            "context": "The Mona Lisa is a half-length portrait painting by Italian Renaissance artist Leonardo da Vinci. It has been on permanent display in the Louvre Museum in Paris since 1797.",
            "ground_truth": "Leonardo da Vinci",
        },
        {
            "question": "What is the speed of light in a vacuum?",
            "context": "The speed of light in vacuum, commonly denoted c, is a universal physical constant equal to 299,792,458 metres per second (approximately 300,000 km/s or 186,000 mi/s).",
            "ground_truth": "299,792,458 metres per second",
        },
        {
            "question": "How many continents are there on Earth?",
            "context": "Earth has seven continents: Africa, Antarctica, Asia, Australia (Oceania), Europe, North America, and South America. These are large, continuous landmasses separated by oceans.",
            "ground_truth": "seven",
        },
        {
            "question": "What element does 'O' represent on the periodic table?",
            "context": "Oxygen is a chemical element with the symbol O and atomic number 8. It is a member of the chalcogen group in the periodic table, a highly reactive nonmetal.",
            "ground_truth": "Oxygen",
        },
        {
            "question": "Who was the first person to walk on the Moon?",
            "context": "Neil Armstrong was an American astronaut and aeronautical engineer who became the first person to walk on the Moon on July 21, 1969, during the Apollo 11 mission.",
            "ground_truth": "Neil Armstrong",
        },
        {
            "question": "What is the longest river in the world?",
            "context": "The Nile is a major north-flowing river in northeastern Africa, and is commonly regarded as the longest river in the world, stretching approximately 6,650 km (4,130 miles).",
            "ground_truth": "Nile",
        },
        {
            "question": "What gas do plants absorb from the atmosphere during photosynthesis?",
            "context": "Photosynthesis is the process used by plants, algae, and some bacteria to convert light energy into chemical energy. During this process, plants absorb carbon dioxide (CO2) and water, using sunlight to produce glucose and oxygen.",
            "ground_truth": "carbon dioxide",
        },
        {
            "question": "Who invented the telephone?",
            "context": "Alexander Graham Bell is credited with inventing and patenting the first practical telephone in 1876. He was a Scottish-American inventor, scientist, and engineer.",
            "ground_truth": "Alexander Graham Bell",
        },
        {
            "question": "What is the smallest country in the world?",
            "context": "Vatican City, officially the Vatican City State, is an independent city-state enclaved within Rome, Italy. Covering just 44 hectares (110 acres), it is the smallest state in the world.",
            "ground_truth": "Vatican City",
        },
        {
            "question": "What is the hardest natural substance on Earth?",
            "context": "Diamond is a solid form of the element carbon with its atoms arranged in a crystal structure called diamond cubic. Diamond is the hardest known natural material, rating 10 on the Mohs hardness scale.",
            "ground_truth": "Diamond",
        },
        {
            "question": "How many sides does a hexagon have?",
            "context": "A hexagon is a polygon with six edges and six vertices. The total of the internal angles of any simple hexagon is 720 degrees. A regular hexagon has all sides equal and all interior angles equal to 120 degrees.",
            "ground_truth": "six",
        },
        {
            "question": "What ocean is the largest in the world?",
            "context": "The Pacific Ocean is the largest and deepest of Earth's five oceanic divisions. It extends from the Arctic Ocean in the north to the Southern Ocean in the south, and is bounded by Asia and Australia in the west and the Americas in the east.",
            "ground_truth": "Pacific Ocean",
        },
        {
            "question": "In which country is the Amazon River located?",
            "context": "The Amazon River in South America is the largest river by discharge volume of water in the world, and by some definitions it is the longest. It flows through Brazil, Peru, and Colombia.",
            "ground_truth": "Brazil",
        },
        {
            "question": "What is the boiling point of water at sea level in Celsius?",
            "context": "Water boils at 100 degrees Celsius (212 degrees Fahrenheit) at standard atmospheric pressure (sea level). This temperature is also called the boiling point of water.",
            "ground_truth": "100 degrees Celsius",
        },
        {
            "question": "Who developed the theory of general relativity?",
            "context": "General relativity is a theory of gravitation developed by Albert Einstein between 1907 and 1915. The theory's publication in 1915 showed that gravity results from the curvature of spacetime.",
            "ground_truth": "Albert Einstein",
        },
        {
            "question": "What is the currency of Japan?",
            "context": "The yen is the official currency of Japan. It is the third most traded currency in the foreign exchange market after the United States dollar and the Euro. The currency symbol is ¥ and the ISO code is JPY.",
            "ground_truth": "Yen",
        },
        {
            "question": "How many bones are in the adult human body?",
            "context": "The adult human body has 206 bones. Babies are born with around 270 to 300 bones, but many of these fuse together during childhood and adolescence, resulting in the adult count.",
            "ground_truth": "206",
        },
        {
            "question": "What is the chemical formula for water?",
            "context": "Water is an inorganic compound with the chemical formula H2O. It is a transparent, tasteless, odorless, and nearly colorless chemical substance, and it is the main constituent of Earth's hydrosphere.",
            "ground_truth": "H2O",
        },
        {
            "question": "Who wrote the play Hamlet?",
            "context": "Hamlet, Prince of Denmark is a tragedy written by William Shakespeare sometime between 1599 and 1601. The play centres on Prince Hamlet and his desire to avenge his father's murder by Claudius.",
            "ground_truth": "William Shakespeare",
        },
        {
            "question": "What is the largest country by land area?",
            "context": "Russia is the largest country in the world by land area, covering more than 17.1 million square kilometres. It spans eleven time zones and incorporates a wide range of environments and landforms.",
            "ground_truth": "Russia",
        },
        {
            "question": "What year was the Eiffel Tower built?",
            "context": "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It was constructed from 1887 to 1889 as the centerpiece of the 1889 World's Fair.",
            "ground_truth": "1889",
        },
        {
            "question": "What is the main gas in Earth's atmosphere?",
            "context": "Earth's atmosphere is composed of 78% nitrogen, 21% oxygen, and trace amounts of other gases including argon, carbon dioxide, and water vapour. Nitrogen is the most abundant gas.",
            "ground_truth": "nitrogen",
        },
        {
            "question": "Who is known as the father of modern physics?",
            "context": "Albert Einstein (1879–1955) is widely considered the father of modern physics. He developed the special and general theories of relativity and made significant contributions to quantum mechanics.",
            "ground_truth": "Albert Einstein",
        },
        {
            "question": "What is the tallest mountain in the world?",
            "context": "Mount Everest is Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas. Its elevation of 8,848.86 metres was most recently established in 2020.",
            "ground_truth": "Mount Everest",
        },
        {
            "question": "What language is spoken in Brazil?",
            "context": "Portuguese is the official and national language of Brazil, and is widely spoken by the vast majority of the population. Brazil is the only Portuguese-speaking country in the Americas.",
            "ground_truth": "Portuguese",
        },
        {
            "question": "What is the powerhouse of the cell?",
            "context": "Mitochondria are membrane-bound organelles found in the cytoplasm of eukaryotic cells. They generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy, earning the nickname 'the powerhouse of the cell'.",
            "ground_truth": "mitochondria",
        },
        {
            "question": "Who invented the World Wide Web?",
            "context": "Sir Timothy John Berners-Lee, a British computer scientist, invented the World Wide Web in 1989. He made the proposal while working at CERN and implemented the first successful communication between an HTTP client and server in 1989.",
            "ground_truth": "Tim Berners-Lee",
        },
        {
            "question": "What is the national language of Pakistan?",
            "context": "Urdu is the national language of Pakistan. It serves as a lingua franca among the country's diverse linguistic groups and is one of the two official languages of Pakistan, the other being English.",
            "ground_truth": "Urdu",
        },
        {
            "question": "What planet is known as the Red Planet?",
            "context": "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System, being larger than only Mercury. Mars is often called the Red Planet due to its reddish appearance caused by iron oxide on its surface.",
            "ground_truth": "Mars",
        },
        {
            "question": "How many players are on a football (soccer) team?",
            "context": "Association football, commonly known as football or soccer, is played between two teams of eleven players each. The sport is governed worldwide by FIFA (Fédération Internationale de Football Association).",
            "ground_truth": "eleven",
        },
        {
            "question": "What is the atomic number of carbon?",
            "context": "Carbon is a chemical element with the symbol C and atomic number 6. It is nonmetallic and tetravalent—its atom making four electrons available to form covalent chemical bonds.",
            "ground_truth": "6",
        },
        {
            "question": "Who was the first President of the United States?",
            "context": "George Washington was an American military officer, statesman, and Founding Father who served as the first president of the United States from 1789 to 1797.",
            "ground_truth": "George Washington",
        },
        {
            "question": "What is the largest organ in the human body?",
            "context": "The skin is the largest organ of the human body. In adults, it covers an area of about 2 square metres (22 square feet) and accounts for about 15% of body weight.",
            "ground_truth": "skin",
        },
        {
            "question": "In what year did the Titanic sink?",
            "context": "RMS Titanic was a British ocean liner that sank on 15 April 1912 after striking an iceberg during its maiden voyage from Southampton to New York City. Of the estimated 2,224 passengers and crew aboard, more than 1,500 died.",
            "ground_truth": "1912",
        },
        {
            "question": "What is the unit of electrical resistance?",
            "context": "The ohm (symbol: Ω) is the unit of electrical resistance in the International System of Units (SI). It is named after German physicist Georg Simon Ohm.",
            "ground_truth": "ohm",
        },
        {
            "question": "What is the capital city of Australia?",
            "context": "Canberra is the capital city of Australia. The city was purpose-built as a compromise between rival cities Sydney and Melbourne. It is located in the Australian Capital Territory.",
            "ground_truth": "Canberra",
        },
        {
            "question": "Who wrote 'Pride and Prejudice'?",
            "context": "Pride and Prejudice is an 1813 novel of manners by Jane Austen. The novel follows the character development of Elizabeth Bennet, the dynamic protagonist who learns about the repercussions of hasty judgments.",
            "ground_truth": "Jane Austen",
        },
        {
            "question": "What is the freezing point of water in Fahrenheit?",
            "context": "Water freezes at 0 degrees Celsius, which is equivalent to 32 degrees Fahrenheit at standard atmospheric pressure. The Fahrenheit scale was proposed by German-Polish physicist Daniel Gabriel Fahrenheit in 1724.",
            "ground_truth": "32 degrees Fahrenheit",
        },
        {
            "question": "What organ pumps blood through the human body?",
            "context": "The heart is a muscular organ that pumps blood throughout the body via the circulatory system. In humans, it is located between the lungs, in the middle compartment of the chest.",
            "ground_truth": "heart",
        },
        {
            "question": "What is the most spoken language in the world?",
            "context": "Mandarin Chinese is the most spoken language in the world by number of native speakers. English is the most widely spoken language when counting both native and non-native speakers.",
            "ground_truth": "Mandarin Chinese",
        },
        {
            "question": "What force keeps planets in orbit around the Sun?",
            "context": "Gravity is the force that keeps planets in orbit around the Sun. Isaac Newton first described gravity as a universal force of attraction between all masses in his law of universal gravitation.",
            "ground_truth": "gravity",
        },
        {
            "question": "What is the chemical symbol for sodium?",
            "context": "Sodium is a chemical element with the symbol Na (from Latin: natrium) and atomic number 11. It is a soft, silvery-white, highly reactive metal.",
            "ground_truth": "Na",
        },
        {
            "question": "Who discovered penicillin?",
            "context": "Penicillin was discovered by Scottish physician Alexander Fleming in 1928. He noticed that a mold called Penicillium notatum had contaminated one of his petri dishes and was killing the bacteria around it.",
            "ground_truth": "Alexander Fleming",
        },
        {
            "question": "How many hours are in a day?",
            "context": "A day is approximately the period during which Earth completes one rotation around its axis. A solar day is exactly 24 hours, divided into two 12-hour periods: AM (ante meridiem) and PM (post meridiem).",
            "ground_truth": "24",
        },
        {
            "question": "What is the square root of 144?",
            "context": "The square root of a number is a value that, when multiplied by itself, gives the original number. The square root of 144 is 12, because 12 × 12 = 144.",
            "ground_truth": "12",
        },
    ]

    assert len(synthetic) == SAMPLE_SIZE, (
        f"Synthetic NQ list has {len(synthetic)} items, expected {SAMPLE_SIZE}"
    )
    return synthetic


def _try_download_nq(timeout_seconds: int = 120) -> list[dict]:
    """Attempt to download NQ in a background thread with a timeout.

    Returns an empty list if it times out or fails.
    """
    import threading

    candidates: list[dict] = []
    error: list[Exception] = []

    def _worker() -> None:
        try:
            from datasets import load_dataset  # type: ignore

            ds = load_dataset(
                "google-research-datasets/natural_questions",
                split="validation",
                streaming=True,
            )

            rng = random.Random(SEED)

            for ex in ds:
                annotations = ex.get("annotations", {})
                short_answers = annotations.get("short_answers", [])

                text_answer = None
                for sa_list in short_answers:
                    texts = sa_list.get("text", [])
                    if texts:
                        text_answer = texts[0]
                        break

                if text_answer is None:
                    continue

                document_tokens = ex.get("document", {}).get("tokens", {})
                token_texts = document_tokens.get("token", [])
                is_html = document_tokens.get("is_html", [])
                plain_tokens = [t for t, h in zip(token_texts, is_html) if not h]
                context = " ".join(plain_tokens[:300])

                candidates.append({
                    "question": ex["question"]["text"],
                    "context": context,
                    "ground_truth": text_answer,
                })

                if len(candidates) >= SAMPLE_SIZE * 5:
                    break
        except Exception as exc:
            error.append(exc)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        logger.warning(
            "NQ download timed out after %ds; switching to synthetic fallback.",
            timeout_seconds,
        )
        return []

    if error:
        logger.warning("NQ download raised %s; switching to synthetic fallback.", error[0])
        return []

    return candidates


def download_natural_questions() -> list[dict]:
    """Download Natural Questions validation split and extract short answers.

    Falls back to synthetic questions if the dataset is too slow or complex.
    NQ is notoriously large; a 120-second thread timeout guards against hangs.
    Caches result to backend/eval/datasets/natural_questions.json.
    """
    cache_path = DATASETS_DIR / "natural_questions.json"
    if cache_path.exists():
        logger.info("Loading Natural Questions from cache: %s", cache_path)
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    logger.info("Downloading Natural Questions from HuggingFace (120s timeout) …")
    candidates = _try_download_nq(timeout_seconds=120)

    rng = random.Random(SEED)
    if len(candidates) >= SAMPLE_SIZE:
        result = rng.sample(candidates, SAMPLE_SIZE)
    elif len(candidates) > 0:
        logger.warning(
            "Only found %d NQ candidates (wanted %d); padding with synthetic fallback.",
            len(candidates),
            SAMPLE_SIZE,
        )
        fallback = _nq_fallback()
        result = candidates + fallback[: SAMPLE_SIZE - len(candidates)]
    else:
        logger.warning("Using fully synthetic NQ fallback (50 general-knowledge Qs).")
        result = _nq_fallback()

    _ensure_datasets_dir()
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(
        "Natural Questions: saved %d questions to %s", len(result), cache_path
    )
    return result


# ---------------------------------------------------------------------------
# HotpotQA
# ---------------------------------------------------------------------------

def download_hotpotqa() -> list[dict]:
    """Download HotpotQA fullwiki validation split, combine context, sample 50.

    Caches result to backend/eval/datasets/hotpotqa.json.
    """
    cache_path = DATASETS_DIR / "hotpotqa.json"
    if cache_path.exists():
        logger.info("Loading HotpotQA from cache: %s", cache_path)
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    logger.info("Downloading HotpotQA from HuggingFace …")
    from datasets import load_dataset  # type: ignore

    ds = load_dataset("hotpot_qa", "fullwiki", split="validation")

    rng = random.Random(SEED)
    sampled = rng.sample(list(ds), min(SAMPLE_SIZE, len(ds)))

    result = []
    for ex in sampled:
        # Combine supporting facts into a single context string
        supporting_facts = ex.get("supporting_facts", {})
        titles = supporting_facts.get("title", [])
        sent_ids = supporting_facts.get("sent_id", [])

        # Build a lookup from title -> list of sentences from the context
        ctx_lookup: dict[str, list[str]] = {}
        context_field = ex.get("context", {})
        ctx_titles = context_field.get("title", [])
        ctx_sentences = context_field.get("sentences", [])
        for t, sents in zip(ctx_titles, ctx_sentences):
            ctx_lookup[t] = sents

        # Extract only the supporting sentences
        supporting_sentences: list[str] = []
        for title, sent_id in zip(titles, sent_ids):
            sents = ctx_lookup.get(title, [])
            if sent_id < len(sents):
                supporting_sentences.append(sents[sent_id])

        context = " ".join(supporting_sentences) if supporting_sentences else (
            # Fallback: use first paragraph of first context entry
            " ".join(ctx_sentences[0][:5]) if ctx_sentences else ""
        )

        result.append({
            "question": ex["question"],
            "context": context,
            "ground_truth": ex["answer"],
        })

    _ensure_datasets_dir()
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info("HotpotQA: saved %d questions to %s", len(result), cache_path)
    return result


# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------

def download_all() -> dict[str, list[dict]]:
    """Download all three datasets and return them keyed by name."""
    return {
        "squad": download_squad(),
        "natural_questions": download_natural_questions(),
        "hotpotqa": download_hotpotqa(),
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
    datasets = download_all()
    for name, questions in datasets.items():
        print(f"{name}: {len(questions)} questions")
        print(f"  Sample: {questions[0]['question']!r}")
