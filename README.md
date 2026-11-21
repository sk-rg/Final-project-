# SENTRA // Incident Board: Interactive Web Security Sandbox

Ghurir final project, 42 Amman / 42 Irbid, November 2026.

**Live site:** <https://sk-rg.github.io/Final-project-/>

**Repository:** <https://github.com/sk-rg/Final-project->

Three interactive labs. In each one you press a payload, see the vulnerability happen, switch to the fixed version, and watch the same payload fail.

| Case | Site | Vulnerability | OWASP | CWE |
|------|------|---------------|-------|-----|
| 101 | Profile Dashboard photo upload | Unrestricted file upload | A04:2021 Insecure Design | CWE-434 |
| 102 | Wanderly Travel booking site | Supply chain attack (compromised dependency) | A08:2021 Software and Data Integrity Failures | CWE-829 |
| 103 | CitizenHub licence lookup | ReDoS | OWASP ReDoS page (input validation) | CWE-1333 |

One-sentence briefs (every team member should be able to say these):

1. **Profile Dashboard.** The server trusted the file name, so a script renamed photo.jpg got in; now it reads the real first bytes of the file.
2. **Wanderly Travel.** A tampered booking library copied what visitors typed; now the version is pinned and the browser checks an integrity hash.
3. **CitizenHub.** A nested regex let one short input freeze the lookup; now the pattern has no nested repeat and the length is capped.

## Run it

Open `index.html` in a browser, or serve the folder:

```
git clone https://github.com/sk-rg/Final-project-.git
cd Final-project-
python3 -m http.server 8000     # then open http://localhost:8000
```

Only HTML, CSS and JavaScript. No backend, no login, no database, no frameworks, no build step.

## Deploy (GitHub Pages)

The site is served by GitHub Pages from branch `main`, folder `/ (root)`, at <https://sk-rg.github.io/Final-project-/>. After every push, wait a minute, open the live URL and test all three labs there before the deadline (42 Amman: Saturday 21 November 2026, 11:59 PM).

## Files

```
index.html                       the detective board (home)
lab1-file-upload.html            Case 101
lab2-supply-chain.html           Case 102
lab3-redos.html                  Case 103
css/style.css                    one design for the whole site
js/common.js                     header/footer, progress, mode switch, code panels, SHA-256
js/board.js                      yarn, stamps, final report
js/lab1.js  js/lab2.js  js/lab3.js   lab logic (all simulated)
lib/booking-lib.js               trusted library, Lab 2
lib/booking-lib.tampered.js      simulated compromised build, Lab 2
tools/print-hash.js              prints the integrity hashes
```
