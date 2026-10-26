---
title: Introducing RiskGrep
description: RiskGrep is an open-source tool that scores files for secrets and biometric data, so a Claude Code hook, a git hook, or CI can check a file before it is read or committed.
pubDate: 2026-10-25
tags: [riskgrep, opensource, AI]
---

Today I'm introducing a project I've been working on, but before I get to the what, I want to address the why.

More and more of us are getting used to handing our data to whatever company asks for it, and unless you are habitually on guard against that, it's easy to become inured to it. In the era of LLMs especially, more and more people are giving tools they don't really understand access to their personal devices, with limited safeguards on what data those tools will extract from their usage. Forget which files an agent is going to read or whether it is vulnerable to prompt injection — many people will happily paste their data straight into a chatbot window on the web.

Setting aside what people will willingly give up, let's zero in on the concern that started me down the road of this project. AI agents are a significant risk factor for sensitive data exfiltration. Part of that is the potential for a hostile agent, or an agent manipulated by prompt injection, to exfiltrate data "deliberately." But even your own agent, operating on your explicit instructions, can expose personal or sensitive data to the AI companies themselves, sending it to their servers in the course of routine usage, where it may be used for training or for whatever other purposes are buried in the fine print of terms of service you haven't read.

The real solution to this is sandboxing — aggressively restricting an agent's freedom to bring files, resources, or data into its context by giving it its own secure, isolated environment to run in. Unfortunately, like many sufficiently robust security solutions, running an agent fully sandboxed can be onerous and frustrating, and it gets in the way of some of the utility AI agents are supposed to bring. The resulting friction means many people just don't sandbox their agents; they run them as-is on their personal machines, with whatever level of access the agent asks for.

After reading [“Friends don’t let friends feed their data to AI agents”](https://www.theverge.com/tech/1011938/muse-ai-data-friends-consent) in The Verge (author's note: I like The Verge a lot, generally speaking, but I don't particularly like this article or think it makes an especially compelling case for anything other than distrust of Meta, a case that company tends to make well enough on its own), I was thinking more about what a middle-ground solution could look like. Say you really want some of the benefits of running AI agents on your own devices, and you want some measure of control over what data the agent ingests, but sandboxing is too blunt an instrument for you: in effectively preventing any data from being read that you wouldn't want read, it also keeps you from using agents effectively in ways you might want to. It seemed to me that it must be possible to build a tool that controls which files or data sources an agent can read based on the data itself, so that an agent harness could automatically decide whether a file was safe for the agent to read before the agent ever got to read it.

Enter [RiskGrep](https://github.com/jkotzker/riskgrep). Inspired by static analysis tools for code scanning, it is my attempt at a tool that uses heuristics to score how likely a file or piece of data is to contain information you might not want a system like an AI agent to have access to. It comes with user-configurable rulesets, starting with secrets and biometric data, and it is designed to be both lightning fast and as accurate as possible without involving any LLMs: it scores files entirely from its heuristics, and nothing leaves your machine. That means you can use it in a Claude Code hook to stop an agent from reading a file likely to contain secrets, in a git hook to prevent accidental commits of personal data, or in CI to fail a pull request whose test fixtures inadvertently contain real user data.

Rulesets are written using [YARA-X](https://virustotal.github.io/yara-x/), VirusTotal's excellent open-source pattern-matching tool. Today RiskGrep scans for biometric data (voice and face embeddings) and for secrets like passwords, API keys, and recovery codes, and I plan to add rulesets for financial data, healthcare data, PII, and more.

RiskGrep is intended to guard against accidental exposure by an agent that is cooperating with you, or to be used by a harness in conjunction with other tools like permissions systems to enable additional safeguards. It isn't a defense against an agent that is actively trying to get around it, and it isn't a replacement for sandboxing. It lives in that middle layer I described earlier, providing some measure of data protection where otherwise there was likely to be none.

RiskGrep v1.1.0 is out today, with a set of detection improvements and reliability fixes (the details are below, for anyone who wants them). Obviously it's not perfect, and I already have a backlog of things I want to do: new rulesets to add, capabilities to expand, and more. But the tool is fully open source, and the [issue tracker](https://github.com/jkotzker/riskgrep/issues) is public. I'm very excited about the potential of this project, and I hope it will prove to be a powerful tool for keeping your private data out of places it shouldn't be. If any of this sounds interesting to you, I hope you'll give [RiskGrep](https://github.com/jkotzker/riskgrep) a look!

## Getting started

RiskGrep runs on macOS and Linux. It's written in Rust and published on [crates.io](https://crates.io/crates/riskgrep), so if you have Rust 1.99.1 or later installed ([rustup](https://rustup.rs) will set it up for you), you can install the command-line tool and the Claude Code hook with:

```sh
cargo install --locked riskgrep riskgrep-claude
riskgrep rules compile
```

The second command compiles the rules up front, so your first scan doesn't have to. From there:

```sh
riskgrep scan path/to/project    # score a file or a whole directory
riskgrep git install-hook        # stop commits that add secrets or biometric data
riskgrep-claude print-config     # print the settings that add the hook to Claude Code
```

The [README](https://github.com/jkotzker/riskgrep#readme) covers configuration, thresholds, and the full Claude Code setup, and the [known limitations](https://github.com/jkotzker/riskgrep/blob/main/docs/known-limitations.md) are worth reading before you rely on a score.

## What's new in v1.1.0

- **New rules for credential files:** one-time-password secrets and authenticator export links, plaintext password-manager exports (Bitwarden, 1Password, LastPass, Chrome, and Apple Passwords), two-factor recovery codes, and encrypted vaults such as KeePass databases and macOS keychains.
- **More coverage in the Claude Code hook:** it now checks MCP tools and `Glob` as well as `Read`, `Grep`, and `Bash`, and it lets an agent read the unflagged parts of many more files instead of asking about the whole file.
- **More text formats:** UTF-16 and UTF-32 text files are scanned instead of being skipped as binary.
- **A cache that stays small:** `riskgrep cache prune` removes old entries, and scans prune automatically at most once a day.
- **An updated engine:** YARA-X 1.22.0.

The full list is in the [release notes](https://github.com/jkotzker/riskgrep/releases/tag/v1.1.0).
