"""Switch the contact form from the visible recipient email to FormSubmit's random-string alias.

Usage: python tools/set_form_endpoint.py <alias>
<alias> is the random string FormSubmit emails you after you confirm your address (the full
https://formsubmit.co/<alias> URL is also accepted). Email addresses are refused. This only rewrites the form's
action attribute; it does not send anything. Follow docs/contact-form.md, including the real submission test,
before treating the form as fixed.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    alias = re.sub(r"^https?://formsubmit\.co/(?:ajax/)?", "", sys.argv[1].strip()).strip("/")
    if "@" in alias or not re.fullmatch(r"[A-Za-z0-9_.~-]{10,}", alias):
        sys.exit("That does not look like a FormSubmit random alias (no email addresses; letters, digits, - _ . ~ only).")
    page = ROOT / "contact" / "index.html"
    text = page.read_text(encoding="utf-8")
    tag = re.search(r"<form[^>]*data-contact-form[^>]*>", text)
    if not tag or not re.search(r'\baction="https://formsubmit\.co/[^"]+"', tag.group(0)):
        sys.exit("Could not find the contact form's FormSubmit action.")
    new_tag = re.sub(r'\baction="https://formsubmit\.co/[^"]+"', f'action="https://formsubmit.co/{alias}"', tag.group(0), count=1)
    updated = text[: tag.start()] + new_tag + text[tag.end():]
    page.write_text(updated, encoding="utf-8")
    print(f"contact/index.html: form action now https://formsubmit.co/{alias[:4]}... (alias hidden in this output).")
    print("Next: run python tools/site_qa.py, deploy, then complete the real submission test in docs/contact-form.md.")


if __name__ == "__main__":
    main()
