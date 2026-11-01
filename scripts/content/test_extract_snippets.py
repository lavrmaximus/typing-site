import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from extract_snippets import extract_from_source  # noqa: E402

FIXTURE = '''import math


def gcd(a: int, b: int) -> int:
    """
    Greatest common divisor of a and b.

    >>> gcd(12, 18)
    6
    >>> gcd(5, 0)
    5
    """
    while b:


        a, b = b, a % b
    if a < 0:
        a = -a
    result = a
    check = result >= 0
    assert check
    return result


def tiny():
    return 1


def tabbed():
\tx = 1
\ty = 2
\tz = 3
\tw = 4
\tv = 5
\tu = 6
\treturn x
'''


class ExtractTest(unittest.TestCase):
    def setUp(self):
        self.snips = extract_from_source(FIXTURE, "maths/gcd.py")

    def test_only_long_enough_space_indented_functions(self):
        self.assertEqual([s["id"] for s in self.snips], ["maths/gcd.py#gcd"])

    def test_docstring_reduced_to_first_line_without_doctests(self):
        code = self.snips[0]["code"]
        self.assertNotIn(">>>", code)
        self.assertIn('    """Greatest common divisor of a and b."""\n', code)

    def test_blank_lines_collapsed(self):
        self.assertNotIn("\n\n\n", self.snips[0]["code"])
        self.assertIn("while b:\n\n        a, b", self.snips[0]["code"])

    def test_source_url(self):
        self.assertEqual(
            self.snips[0]["url"],
            "https://github.com/TheAlgorithms/Python/blob/master/maths/gcd.py",
        )

    def test_rejects_non_ascii_and_long_lines(self):
        src = "def f():\n" + "".join(f"    x{i} = 'ё'\n" for i in range(9))
        self.assertEqual(extract_from_source(src, "a.py"), [])
        src = "def g():\n" + "".join(f"    y{i} = {'1' * 90}\n" for i in range(9))
        self.assertEqual(extract_from_source(src, "b.py"), [])


if __name__ == "__main__":
    unittest.main()
