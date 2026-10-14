# Contact form: hide the recipient address

**Status: NOT FIXED.** The form still posts to `https://formsubmit.co/<recipient email>`, so the address is visible in the page source. Do not describe the form as fixed until every step below has passed.

FormSubmit documents a "random-like string" that replaces your email address in the form's `action`. It is emailed to the form owner when the address is confirmed (FormSubmit documentation, "Advanced features").

## What the owner must do (the part only you can do)

1. Open the recipient inbox, including spam, and look for an email from FormSubmit. If the form was confirmed before, the alias may be in that original confirmation email.
2. If you cannot find it, submit the live contact form once. FormSubmit emails a confirmation request. Click it, then look for the follow-up email containing the random string.
3. If no alias arrives, stop and check FormSubmit's documentation or support. Do not edit the form on a guess.
4. From the repository root run `python tools/set_form_endpoint.py <alias>`. It accepts the string or the full `https://formsubmit.co/<alias>` URL, refuses anything containing `@`, and rewrites only the form's `action`.
5. Run `python tools/site_qa.py`. The warning "contact form endpoint exposes the recipient email address" must disappear.
6. Deploy through the normal process (see `deployment.md`).

## Real submission test (required before calling it fixed)

Run on the **live** site after deployment, once per enquiry type (Media, Speaking, Professional, Book-related):

- [ ] The message arrives at the recipient inbox (check spam).
- [ ] Subject is "New enquiry from the Gareth Mackenzie website" and the table template is used.
- [ ] Replying goes to the visitor's email address (Reply-To).
- [ ] After sending, the browser returns to `/contact/?sent=1#form` and shows "Thank you. Your message has been sent successfully."
- [ ] `curl -s https://mackenziebooks.bbroot.com/contact/ | grep -c gmackenzie` prints `0`.
- [ ] A submission with the hidden `_honey` field filled in does not arrive (optional anti-spam check).
- [ ] The `/contact/?category=media#form` links from the Media page preselect the right enquiry type.

## Limits to accept

- The alias hides the address from scrapers; anyone who has the alias can still post to it. Keep the honeypot and consider FormSubmit's captcha option if spam appears.
- The address has already been public in the live HTML and in the git history of this repository. That cannot be undone; expect some spam and consider an inbox filter.
