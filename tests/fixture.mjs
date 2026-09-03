// A populated library in the real store shape, so every screen can be checked
// with content on it. Also written to samples/ as an importable workspace file.

export function buildFixture() {
  const iso = (days) => {
    const n = new Date();
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + days);
    const z = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  function lec(str, sid) {
    return str.split(";").map((chunk, i) => {
      const p = chunk.split("|");
      return { id: `${sid}-l${i}`, title: p[0], mins: +p[1], done: p[2] === "1" };
    });
  }
  function course(id, title, provider, source, secs) {
    return {
      id, title, provider, source,
      sections: secs.map((s) => ({
        id: `${id}-${s[0]}`, title: s[1], week: s[2], lectures: lec(s[3], `${id}-${s[0]}`),
      })),
    };
  }
  function seedLog(seedN) {
    const out = [];
    let x = seedN;
    for (let i = 0; i < 28; i++) {
      x = (x * 1103515245 + 12345) % 2147483648;
      const r = x / 2147483648;
      const nn = new Date();
      const dow = new Date(nn.getFullYear(), nn.getMonth(), nn.getDate() - (27 - i)).getDay();
      let mins = Math.round(r * 74);
      if (dow === 0) mins = Math.round(mins * 1.4);
      if (dow === 3 && r < 0.42) mins = 0;
      out.push({ mins });
    }
    out[25].mins = 51; out[26].mins = 44; out[27].mins = 0;
    return out;
  }

  const CYSA = course("cysa", "CompTIA CySA+ (CS0-004) Complete Course & Practice Exam", "Udemy · Jason Dion",
    "Imported from udemy.com/course/comptia-cysa-003 · 45 sections, 323 lectures, 51h 40m on the page · 10 sections read in full", [
    ["s01", "Introduction to CompTIA CySA+", 1, "Welcome and Course Overview|13|1;The Cybersecurity Analyst Role|9|1;CySA+ CS0-004 Exam Structure and Domains|10|1;Your Course Roadmap: How to Maximize Your Results|10|1;Download your free study guide|1|1"],
    ["s02", "Foundational Security Operations", 1, "Introduction to Security Operations Centers (SOC)|11|1;SOC Roles and Responsibilities|11|1;Security Operations Workflows and Processes|9|1;Continuous Monitoring Concepts|12|0;Shift Operations and Handover Procedures|10|0"],
    ["s03", "Risk Management and Security Controls", 2, "Understanding Risk in Cybersecurity|9|0;Risk Concepts: Appetite, Residual, and Inherent Risk|9|0;Risk Management Strategies|10|0;Security Control Types|10|0;Security Control Functions|11|0;Policies, Governance, and Service-Level Objectives|11|0;Aligning Controls with Business Risk|13|0"],
    ["s04", "System Infrastructure Concepts", 3, "Infrastructure and System Architecture Overview|9|0;Cloud Native Architecture|9|0;Virtualization Technologies and Security|9|0;Containerization Concepts (Docker, Kubernetes)|9|0;Application Programming Interfaces (API) Concepts|8|0;Demo: Detecting API Enumeration Through Log Analysis|8|0;Device Management Concepts|10|0"],
    ["s05", "Network Architecture Concepts", 3, "Network Architecture Fundamentals|8|0;Zero Trust Network Architecture (ZTNA)|9|0;Secure Access Service Edge (SASE)|9|0;Hybrid Cloud Networking|9|0;Network Segmentation and Isolation|9|0;Network Security Best Practices|10|0;Demo: Detecting C2 Beaconing with Wireshark|10|0"],
    ["s06", "Introduction to Critical Infrastructure", 4, "Introduction to Critical Infrastructure|8|0;Operational Technology (OT) Fundamentals|9|0;Industrial Control Systems (ICS)|9|0;SCADA Systems|10|0;OT/ICS/SCADA Threat Landscape|11|0;Security Considerations for Critical Infrastructure|11|0"],
    ["s07", "Operating System Security", 4, "Operating System Security Concepts|9|0;System Hardening Fundamentals|9|0;Windows File Structure and Critical Files|9|0;Linux File Structure and Critical Files|11|0;System Processes and Services|10|0;Demo: Investigating a Suspicious Process|12|0;OS Security Configuration Best Practices|10|0"],
    ["s08", "Logging Concepts and Analysis", 5, "Fundamentals of Security Logging|8|0;Log Ingestion Methods and Strategies|8|0;Log Configuration Best Practices|8|0;Ensuring Log Integrity and Security|8|0;Time Synchronization and NTP|8|0;Log Retention Policies and Compliance|8|0;Basic Log Analysis Techniques|9|0;Demo: Detecting a Brute Force Attack through Log Analysis|13|0"],
    ["s09", "Identity and Access Management", 6, "Identity and Access Management Fundamentals|10|0;Privileged Access Management (PAM)|9|0;Authentication Methods and Technologies|10|0;Authorization Models and Mechanisms|10|0;Secrets Management Best Practices|9|0;IAM Security Considerations|10|0;Demo: Detecting Privilege Escalation Through Group Changes|13|0"],
    ["s10", "Data Protection and Encryption", 7, "Introduction to Data Protection and Encryption|7|0;Data Protection Concepts and Strategies|9|0;Encryption Fundamentals|9|0;Symmetric vs. Asymmetric Encryption|9|0;Encryption Techniques and Applications|9|0;Data Classification and Handling|9|0;Detecting Data Exfiltration|10|0;Demo: Detecting Data Exfiltration Using Encrypted Archives|12|0"],
  ]);

  const base = (o) => ({
    bufferDays: 7, studyDays: [1, 2, 3, 4, 5], startTime: "19:00",
    actuals: {}, doneAt: {}, sessions: [], notes: {}, cards: [], ...o,
  });

  const spaces = [
    base({
      id: "ws-cysa", name: "CompTIA CySA+ CS0-004", examDate: iso(44), hoursPerWeek: 5, log: seedLog(7),
      courses: [CYSA, course("lab", "Blue-team home lab", "Own plan · Security Onion + Sysmon", "Written by hand", [
        ["l1", "Lab build", 2, "Security Onion install|38|1;Sysmon on the Windows host|24|0;Log forwarding into the stack|29|0"],
        ["l2", "Detection practice", 5, "Replay a PCAP through Zeek|33|0;Write three Sigma rules|41|0;Tune out the noise|27|0"],
        ["l3", "Exam-week revision", 8, "Rebuild the lab from notes|55|0;Speed-run the ATT&CK matrix|35|0"],
      ])],
      notes: {
        "cysa-s08-l7": "Brute force in the logs = many 4625s then one 4624 from the same source.\n\n03:40 — baseline first. Ten failures at 09:00 on a Monday is a human; ten a second is a script.\n09:15 — check the workstation name field. Empty or garbage usually means it isn't a domain machine.\n\nExam angle: they want you to spot the SUCCESS after the failures. That's the pivot point.",
        "cysa-s02-l1": "SOC tiers, plainly:\nT1 triages alerts and escalates. T2 investigates and scopes. T3 hunts and builds detections.\n\n06:20 — the threat intel analyst and the incident responder are specialist roles, not tiers.",
        "cysa-s05-l1": "ZTNA = never trust, always verify. Three legs: identity (IAM), device trust, microsegmentation.\n\n04:55 — the point of microsegmentation is blast radius, not prevention.\nSASE is ZTNA + SD-WAN + SWG + CASB delivered from the cloud edge.",
        "lab-l1-l0": "Security Onion 2.4, eval mode, 16 GB RAM or it thrashes.\n\nSet the management interface FIRST — changing it after is a reinstall.\n`sudo so-status` to check the stack came up.",
      },
      cards: [
        { id: "cy1", lectureId: "cysa-s08-l7", q: "Which Windows event IDs mark a successful brute force?", a: "A run of 4625 (failed logon) from one source, then a 4624 (success). The 4624 is the compromise point." },
        { id: "cy2", lectureId: "cysa-s05-l1", q: "ZTNA vs SASE — what's the difference?", a: "ZTNA is the access model (verify identity + device, microsegment). SASE is the delivery architecture: ZTNA plus SD-WAN, SWG and CASB from the cloud edge." },
        { id: "cy3", lectureId: "cysa-s02-l1", q: "What does a SOC tier 3 analyst do that tier 2 doesn't?", a: "Proactive threat hunting and detection engineering — tier 2 investigates alerts that already fired." },
        { id: "cy4", lectureId: "lab-l1-l0", q: "First thing to configure on a fresh Security Onion install?", a: "The management interface. Changing it afterwards means reinstalling." },
      ],
      actuals: { "cysa-s01-l0": 16, "cysa-s02-l0": 11, "cysa-s02-l2": 12 },
      sessions: [
        { at: new Date(Date.now() - 864e5 * 2 + 72e5).toISOString(), focusSecs: 3180, breakSecs: 420, focusMins: 53, breaks: 1, lectures: [{ id: "cysa-s01-l0", mins: 16 }, { id: "cysa-s01-l1", mins: 9 }] },
        { at: new Date(Date.now() - 864e5 + 68e5).toISOString(), focusSecs: 2640, breakSecs: 0, focusMins: 44, breaks: 0, lectures: [{ id: "cysa-s02-l0", mins: 11 }] },
      ],
    }),
    base({
      id: "ws-py", name: "Python for security", examDate: "", hoursPerWeek: 3, log: seedLog(23),
      courses: [course("pysec", "Automate the Boring Stuff, security cut", "Udemy · Al Sweigart", "Imported from a link", [
        ["y1", "Files and regex", 1, "Regex you keep forgetting|21|1;Walking a directory tree|15|1;Parsing a log file|24|0"],
        ["y2", "APIs and requests", 3, "Auth headers and retries|18|0;Pulling from a threat feed|22|0;Rate limits|11|0"],
        ["y3", "Small tools", 5, "An IOC enrichment script|34|0;Packaging it for the team|19|0"],
      ])],
      notes: { "pysec-y1-l0": "Non-greedy `.*?` is the one I keep forgetting.\n\nUse named groups — `(?P<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)` — and the parse code reads itself later." },
      cards: [{ id: "py1", lectureId: "pysec-y1-l0", q: "Greedy vs non-greedy quantifier?", a: "`.*` takes as much as possible; `.*?` takes as little as possible. Use non-greedy when matching up to a delimiter." }],
    }),
    base({
      id: "ws-de", name: "German A2", examDate: iso(96), hoursPerWeek: 3, log: seedLog(41),
      courses: [course("gram", "A2 grammar, week by week", "Deutsch mit Marija", "Written by hand", [
        ["g1", "Perfekt tense", 1, "Haben vs sein|14|1;Irregular participles|18|0;Drills|25|0"],
        ["g2", "Dative case", 3, "Prepositions with dative|16|0;Pronoun tables|12|0;Drills|25|0"],
        ["g3", "Subordinate clauses", 6, "weil, dass, wenn|19|0;Word order practice|22|0"],
      ])],
      notes: { "gram-g1-l0": "Sein for movement and change of state: gehen, fahren, kommen, werden, sterben.\nEverything else takes haben. Mnemonic: if you moved or you changed, you *are* it." },
      cards: [{ id: "de1", lectureId: "gram-g1-l0", q: "Which verbs form the Perfekt with sein?", a: "Verbs of motion (gehen, fahren, kommen) and change of state (werden, sterben, aufwachen). Everything else takes haben." }],
    }),
  ];

    return { schema: 1, spaces, savedAt: new Date().toISOString() };
  }

  /** The same library as a portable export file, for the transfer dialog. */
  export function buildSampleExport() {
    return {
      app: "studyframe",
      version: 1,
      exportedAt: new Date().toISOString(),
      spaces: buildFixture().spaces,
    };
  }

