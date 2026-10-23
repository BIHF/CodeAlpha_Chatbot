"""
NLP Engine for CodeAlpha Cloud AI Chatbot
Implements Porter Stemming, Tokenization, Contraction Expansion,
N-gram Generation, TF-IDF Vectorization, and Cosine Similarity Matching.
"""

import math
import re
from collections import Counter, defaultdict

# Common English Contractions
CONTRACTIONS = {
    "what's": "what is",
    "who's": "who is",
    "where's": "where is",
    "how's": "how is",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "i'm": "i am",
    "you're": "you are",
    "they're": "they are",
    "we're": "we are",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "i'll": "i will",
    "you'll": "you will",
    "they'll": "they will",
    "let's": "let us",
    "i'd": "i would",
    "you'd": "you would"
}

# Standard English stop words including generic question markers
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "hers", "herself", "him", "himself", "his", "how", "i", "i'd", "i'll", "i'm", "i've",
    "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
    "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off",
    "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
    "shouldn't", "so", "some", "such", "tell", "than", "that", "that's", "the", "their",
    "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
    "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll",
    "we're", "we've", "were", "weren't", "what", "where", "which", "while", "who", "why",
    "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
    "your", "yours", "yourself", "yourselves"
}


class PorterStemmer:
    """Lightweight pure-Python implementation of the Porter Stemming Algorithm."""

    def __init__(self):
        self.b = ""
        self.k = 0
        self.k0 = 0
        self.j = 0

    def _cons(self, i):
        if self.b[i] in "aeiou":
            return False
        if self.b[i] == "y":
            if i == self.k0:
                return True
            else:
                return not self._cons(i - 1)
        return True

    def _m(self):
        n = 0
        i = self.k0
        while True:
            if i > self.j:
                return n
            if not self._cons(i):
                break
            i += 1
        i += 1
        while True:
            while True:
                if i > self.j:
                    return n
                if self._cons(i):
                    break
                i += 1
            i += 1
            n += 1
            while True:
                if i > self.j:
                    return n
                if not self._cons(i):
                    break
                i += 1
            i += 1

    def _vowelinstem(self):
        for i in range(self.k0, self.j + 1):
            if not self._cons(i):
                return True
        return False

    def _doublec(self, i):
        if i < self.k0 + 1:
            return False
        if self.b[i] != self.b[i - 1]:
            return False
        return self._cons(i)

    def _cvc(self, i):
        if i < self.k0 + 2 or not self._cons(i) or self._cons(i - 1) or not self._cons(i - 2):
            return False
        ch = self.b[i]
        if ch in "wxy":
            return False
        return True

    def _ends(self, s):
        length = len(s)
        o = self.k - length + 1
        if o < self.k0:
            return False
        for i in range(length):
            if self.b[o + i] != s[i]:
                return False
        self.j = self.k - length
        return True

    def _setto(self, s):
        length = len(s)
        o = self.j + 1
        for i in range(length):
            self.b[o + i] = s[i]
        self.k = self.j + length

    def _r(self, s):
        if self._m() > 0:
            self._setto(s)

    def _step1ab(self):
        if self.b[self.k] == "s":
            if self._ends("sses"):
                self.k -= 2
            elif self._ends("ies"):
                self._setto("i")
            elif self.b[self.k - 1] != "s":
                self.k -= 1

        if self._ends("eed"):
            if self._m() > 0:
                self.k -= 1
        elif (self._ends("ed") or self._ends("ing")) and self._vowelinstem():
            self.k = self.j
            if self._ends("at"):
                self._setto("ate")
            elif self._ends("bl"):
                self._setto("ble")
            elif self._ends("iz"):
                self._setto("ize")
            elif self._doublec(self.k):
                self.k -= 1
                ch = self.b[self.k]
                if ch in "lsz":
                    self.k += 1
            elif self._m() == 1 and self._cvc(self.k):
                self._setto("e")

    def _step1c(self):
        if self._ends("y") and self._vowelinstem():
            self.b[self.k] = "i"

    def _step2(self):
        c = self.b[self.k - 1] if self.k > self.k0 else ""
        if c == "a":
            if self._ends("ational"): self._r("ate")
            elif self._ends("tional"): self._r("tion")
        elif c == "c":
            if self._ends("enci"): self._r("ence")
            elif self._ends("anci"): self._r("ance")
        elif c == "e":
            if self._ends("izer"): self._r("ize")
        elif c == "l":
            if self._ends("bli"): self._r("ble")
            elif self._ends("alli"): self._r("al")
            elif self._ends("entli"): self._r("ent")
            elif self._ends("eli"): self._r("e")
            elif self._ends("ousli"): self._r("ous")
        elif c == "o":
            if self._ends("ization"): self._r("ize")
            elif self._ends("ation"): self._r("ate")
            elif self._ends("ator"): self._r("ate")
        elif c == "s":
            if self._ends("alism"): self._r("al")
            elif self._ends("iveness"): self._r("ive")
            elif self._ends("fulness"): self._r("ful")
            elif self._ends("ousness"): self._r("ous")
        elif c == "t":
            if self._ends("aliti"): self._r("al")
            elif self._ends("iviti"): self._r("ive")
            elif self._ends("biliti"): self._r("ble")

    def _step3(self):
        c = self.b[self.k]
        if c == "e":
            if self._ends("icate"): self._r("ic")
            elif self._ends("ative"): self._r("")
            elif self._ends("alize"): self._r("al")
        elif c == "i":
            if self._ends("iciti"): self._r("ic")
        elif c == "l":
            if self._ends("ical"): self._r("ic")
            elif self._ends("ful"): self._r("")
        elif c == "s":
            if self._ends("ness"): self._r("")

    def _step4(self):
        if self.k <= self.k0 + 1:
            return
        c = self.b[self.k - 1]
        if c == "a":
            if self._ends("al"): pass
            else: return
        elif c == "c":
            if self._ends("ance") or self._ends("ence"): pass
            else: return
        elif c == "e":
            if self._ends("er"): pass
            else: return
        elif c == "i":
            if self._ends("ic"): pass
            else: return
        elif c == "l":
            if self._ends("able") or self._ends("ible"): pass
            else: return
        elif c == "n":
            if self._ends("ant") or self._ends("ement") or self._ends("ment") or self._ends("ent"): pass
            else: return
        elif c == "o":
            if self._ends("ion") and self.j >= self.k0 and self.b[self.j] in "st": pass
            elif self._ends("ou"): pass
            else: return
        elif c == "s":
            if self._ends("ism"): pass
            else: return
        elif c == "t":
            if self._ends("ate") or self._ends("iti"): pass
            else: return
        elif c == "u":
            if self._ends("ous"): pass
            else: return
        elif c == "v":
            if self._ends("ive"): pass
            else: return
        elif c == "z":
            if self._ends("ize"): pass
            else: return
        else:
            return
        if self._m() > 1:
            self.k = self.j

    def _step5(self):
        self.j = self.k
        if self.b[self.k] == "e":
            a = self._m()
            if a > 1 or (a == 1 and not self._cvc(self.k - 1)):
                self.k -= 1
        if self.b[self.k] == "l" and self._doublec(self.k) and self._m() > 1:
            self.k -= 1

    def stem(self, word):
        """Stem the word to its morphological root."""
        word = word.lower().strip()
        if len(word) <= 2:
            return word
        self.b = list(word)
        self.k = len(word) - 1
        self.k0 = 0
        self._step1ab()
        self._step1c()
        self._step2()
        self._step3()
        self._step4()
        self._step5()
        return "".join(self.b[: self.k + 1])


# Global stemmer instance
_stemmer = PorterStemmer()


def expand_contractions(text):
    """Expand conversational contractions like don't -> do not."""
    text_lower = text.lower()
    for contraction, expanded in CONTRACTIONS.items():
        text_lower = re.sub(r"\b" + re.escape(contraction) + r"\b", expanded, text_lower)
    return text_lower


def tokenize(text, remove_stopwords=False, stem=True):
    """
    Tokenize text into cleaned words and stems.
    Preserves numbers and domain terms like 'k8s', 's3', 'ec2', 'sha-256'.
    """
    text = expand_contractions(text)
    # Normalize hyphens inside alphanumeric words e.g. sha-256
    text = re.sub(r"(\w+)-(\w+)", r"\1\2 \1 \2", text)
    # Extract alphanumeric tokens
    tokens = re.findall(r"\b[a-zA-Z0-9_]+\b", text.lower())

    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOP_WORDS]

    if stem:
        tokens = [_stemmer.stem(t) for t in tokens]

    return tokens


def extract_ngrams(tokens, n=2):
    """Extract word n-grams from a list of tokens."""
    if len(tokens) < n:
        return []
    return ["_".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def damerau_levenshtein_similarity(s1, s2):
    """
    Calculate normalized similarity ratio (0.0 to 1.0) using Damerau-Levenshtein distance,
    which accounts for insertions, deletions, substitutions, and adjacent transpositions.
    """
    s1, s2 = s1.lower().strip(), s2.lower().strip()
    if s1 == s2:
        return 1.0
    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0

    # Distance matrix
    d = [[0] * (len2 + 2) for _ in range(len1 + 2)]
    max_dist = len1 + len2
    d[0][0] = max_dist

    for i in range(0, len1 + 1):
        d[i + 1][0] = max_dist
        d[i + 1][1] = i
    for j in range(0, len2 + 1):
        d[0][j + 1] = max_dist
        d[1][j + 1] = j

    last_row = {}
    for i in range(1, len1 + 1):
        db = 0
        for j in range(1, len2 + 1):
            k = last_row.get(s2[j - 1], 0)
            l = db
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            if cost == 0:
                db = j

            d[i + 1][j + 1] = min(
                d[i][j + 1] + 1,                         # deletion
                d[i + 1][j] + 1,                         # insertion
                d[i][j] + cost,                           # substitution
                d[k][l] + (i - k - 1) + 1 + (j - l - 1)   # transposition
            )
        last_row[s1[i - 1]] = i

    dist = d[len1 + 1][len2 + 1]
    max_len = max(len1, len2)
    return max(0.0, 1.0 - (dist / max_len))


# Alias for backward compatibility
levenshtein_similarity = damerau_levenshtein_similarity


class TFIDFVectorizer:
    """
    High-performance pure-Python TF-IDF Vectorizer
    Supports unigram + bigram feature union and sublinear term frequency scaling.
    """

    def __init__(self, use_ngrams=True, sublinear_tf=True, remove_stopwords=True):
        self.use_ngrams = use_ngrams
        self.sublinear_tf = sublinear_tf
        self.remove_stopwords = remove_stopwords
        self.vocabulary = {}
        self.idf = {}
        self.num_docs = 0

    def _extract_features(self, text):
        unigrams = tokenize(text, remove_stopwords=self.remove_stopwords, stem=True)
        # If stopword removal pruned everything (e.g. short greetings or phrases), fallback to non-stopword tokens
        if not unigrams:
            unigrams = tokenize(text, remove_stopwords=False, stem=True)

        features = list(unigrams)
        if self.use_ngrams and len(unigrams) >= 2:
            bigrams = extract_ngrams(unigrams, n=2)
            features.extend(bigrams)
        return features

    def fit(self, corpus):
        """Fit vectorizer on a collection of document texts."""
        self.num_docs = len(corpus)
        doc_freq = defaultdict(int)

        for text in corpus:
            features = set(self._extract_features(text))
            for feat in features:
                doc_freq[feat] += 1

        self.vocabulary = {feat: idx for idx, feat in enumerate(doc_freq.keys())}

        # Calculate smoothed BM25-style IDF
        self.idf = {}
        for feat, df in doc_freq.items():
            self.idf[feat] = math.log(1.0 + (self.num_docs - df + 0.5) / (df + 0.5)) + 1.0

        return self

    def transform(self, text):
        """Transform text into a sparse TF-IDF feature vector dictionary with L2 norm."""
        features = self._extract_features(text)
        counts = Counter(features)

        vector = {}
        sum_sq = 0.0

        for feat, count in counts.items():
            if feat in self.vocabulary:
                # Sublinear TF: 1 + log(tf)
                tf = (1.0 + math.log(count)) if (self.sublinear_tf and count > 0) else float(count)
                tfidf_val = tf * self.idf.get(feat, 1.0)
                vector[feat] = tfidf_val
                sum_sq += tfidf_val ** 2

        norm = math.sqrt(sum_sq)
        return vector, norm

    @staticmethod
    def cosine_similarity(vec1, norm1, vec2, norm2):
        """Compute cosine similarity between two sparse vector representations."""
        if norm1 <= 0.0 or norm2 <= 0.0:
            return 0.0

        # Dot product on intersecting keys
        if len(vec1) > len(vec2):
            vec1, vec2 = vec2, vec1

        dot_product = sum(val * vec2[k] for k, val in vec1.items() if k in vec2)
        sim = dot_product / (norm1 * norm2)
        return min(1.0, max(0.0, sim))
