import sys

from pdf2docx import Converter


def main():
    if len(sys.argv) != 3:
        print("usage: pdf2word.py <input.pdf> <output.docx>", file=sys.stderr)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    cv = Converter(src)
    try:
        cv.convert(dst)
    finally:
        cv.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
