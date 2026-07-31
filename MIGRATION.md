# Migrating 3ideas.co.uk off FastHosts

Status as at 2026-07-31.

- **Registrar:** 123-reg (both domains)
- **DNS today:** FastHosts (`ns1/ns2/ns3.livedns.co.uk`) — dies when FastHosts is cancelled
- **DNS target:** Cloudflare (free)
- **Web today:** FastHosts WordPress, currently returning **HTTP 500**
- **Web target:** GitHub Pages, `alantdunn/3ideas-website`, already built and serving
- **Email:** Google Workspace — must not be interrupted
- **DNSSEC:** not enabled on either domain, so nameserver changes are clean

The guiding principle: **move DNS first as an exact copy, then change the website.**
Two small reversible steps instead of one big irreversible one.

---

## The current FastHosts zone

Assembled by probing the authoritative nameservers — AXFR is refused, so export the
zone from the FastHosts panel and diff it against this before cancelling.

| Type | Name | Value | TTL |
|---|---|---|---|
| A | @ | 109.228.34.203 | 3600 |
| AAAA | @ | 2a00:da00:100f:f000::200 | 3600 |
| A | www | 109.228.34.203 | 3600 |
| MX | @ | 1 aspmx.l.google.com. | 3600 |
| MX | @ | 5 alt1.aspmx.l.google.com. | 3600 |
| MX | @ | 5 alt2.aspmx.l.google.com. | 3600 |
| MX | @ | 10 alt3.aspmx.l.google.com. | 3600 |
| MX | @ | 10 alt4.aspmx.l.google.com. | 3600 |
| TXT | @ | `v=spf1 mx a include:_spf.livemail.co.uk ~all` | 3600 |
| TXT | _dmarc | `v=DMARC1; p=none;` | 3600 |
| A | mail | 213.171.216.40 | 3600 |
| A | webmail | 213.171.216.231 | 3600 |
| A | smtp | 213.171.216.50 | 3600 |

`mail`, `webmail` and `smtp` are FastHosts mail endpoints. Inbound mail goes to Google
Workspace via the MX records, so these are almost certainly legacy — but check no mail
client or application is still configured against those hostnames before dropping them.

---

## Step 1 — Lift and shift DNS to Cloudflare

Copy the zone **exactly as it is above**. Change nothing yet. The point of this step is
that both FastHosts and Cloudflare serve identical answers, so it does not matter which
one a resolver reaches while the delegation propagates. There is no gap.

1. Add `3ideas.co.uk` to Cloudflare. Its scanner will find most records.
2. **Verify against the table above.** The scan often misses `mail`, `webmail` and `smtp`.
3. Set every record to **DNS only (grey cloud)**. Proxying now would change behaviour and
   defeat the point of an identical copy.
4. Cloudflare gives you two nameservers. At 123-reg, change the nameservers for
   `3ideas.co.uk` to those.
5. Wait for Cloudflare to report the zone active.

**Verify before moving on:**

```bash
dig +short 3ideas.co.uk MX
dig +short 3ideas.co.uk NS
```

MX must still be the five Google Workspace hosts. Send a test email to yourself and
confirm it arrives. Do not continue until mail is confirmed working.

---

## Step 2 — Point the website at GitHub Pages

Only once step 1 is confirmed. In Cloudflare, replace the web records:

**Delete** the apex `A` → `109.228.34.203`, the apex `AAAA`, and the `www` `A` record.

**Add** — all **DNS only (grey cloud)**:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | alantdunn.github.io |

The grey cloud matters: GitHub validates its Let's Encrypt certificate over HTTP, and
Cloudflare's proxy intercepts that and blocks issuance. Leave these unproxied.

Certificate issuance takes a few minutes to an hour. Until it completes, HTTPS will error
— this is expected. Once GitHub reports the certificate as issued, enable
**Enforce HTTPS** in the repository's Pages settings.

**Verify:**

```bash
curl -sI https://3ideas.co.uk/ | head -3
curl -sI https://www.3ideas.co.uk/ | head -3
```

---

## Step 3 — Fix email authentication

Two pre-existing problems, unrelated to this migration, but this is the moment to fix
them because the records are already open in front of you.

**SPF is wrong.** The current record authorises the MX hosts and the old FastHosts web
server, but Google Workspace sends from a different range entirely — so outbound mail has
been failing SPF and relying on the `~all` softfail. The `include:` also becomes a dead
lookup once FastHosts is cancelled. Replace the apex TXT record with:

```
v=spf1 include:_spf.google.com ~all
```

**There is no DKIM.** Nothing at `google._domainkey` or any common selector, so outbound
mail is unsigned. Generate a key in Google Admin → Apps → Google Workspace → Gmail →
Authenticate email, then add the TXT record it gives you at `google._domainkey`.

Once SPF and DKIM are both confirmed passing, consider tightening DMARC from `p=none` to
`p=quarantine`. Not before — `p=none` is what stops a misconfiguration becoming lost mail.

---

## Step 4 — threeideas.co.uk redirect

This domain currently resolves to a 123-reg parking endpoint returning HTTP 405, and has
`mx0/mx1.123-reg.co.uk` MX records.

**Check whether anyone actually receives mail at `@threeideas.co.uk` before touching it.**
If they do, those MX records must be carried across too.

To redirect it to the main site: add `threeideas.co.uk` to Cloudflare, switch its
nameservers at 123-reg, then create an `A` record for `@` pointing at `192.0.2.1`
(a reserved documentation address that never receives traffic) with the orange cloud
**on** — the proxy is what lets a redirect rule run — plus a proxied `CNAME` for `www`.
Then add a Single Redirect rule: hostname matches `threeideas.co.uk` or
`www.threeideas.co.uk` → 301 to `https://3ideas.co.uk/` preserving the path.

GitHub Pages serves exactly one custom domain per repository, which is why this has to
happen at the DNS layer rather than in the site itself.

---

## Step 5 — Cancel FastHosts

Only after everything above is verified.

- [ ] Zone file exported from FastHosts and diffed against the table above
- [ ] Cloudflare serving `3ideas.co.uk`, confirmed with `dig`
- [ ] Test email sent and received on Google Workspace
- [ ] `https://3ideas.co.uk/` and `https://www.3ideas.co.uk/` both serve the new site
- [ ] Enforce HTTPS enabled in GitHub Pages settings
- [ ] SPF corrected, DKIM added, both confirmed passing
- [ ] Anything else hosted at FastHosts accounted for — old mailboxes, databases,
      subdomains, FTP content, the WordPress install itself

That last one is worth real attention. Check the FastHosts control panel for anything
beyond this one website before the account closes and it is gone.

---

## Optional: verify the domain on GitHub

GitHub → Settings → Pages → "Verify a domain" gives you a TXT record to add. This stops
anyone else claiming `3ideas.co.uk` on GitHub Pages if the A records are ever removed.
Safe to do at any point, no live impact.
