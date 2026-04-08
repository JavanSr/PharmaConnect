# PharmaConnect Website Dependencies

This folder owns the dependency set for the isolated public marketing website in `../website`.

Why this exists:
- `CLAUDE.md` and `DECISIONS.md` require the pharmacy management system to remain stable and avoid surprise dependency churn.
- `AGENTS.md` requires small, isolated changes.
- `CODEX_TASKS.md` asks for a separate website app, not changes to `/src`, `/backend`, or `/prisma`.

Physical dependency layout:
- Packages live here in `website-dependencies/node_modules`.
- `website/node_modules` is a Windows junction pointing to this folder.
- The website source remains in `../website`.

Install/update flow:

```powershell
cd ..\website-dependencies
npm install
```

Then run the website from the app folder:

```powershell
cd ..\website
npm run dev
```

Do not install marketing-site dependencies into the root PharmaConnect app unless the higher-priority project instructions are explicitly updated.
