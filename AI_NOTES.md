# AI tools

I used Claude Code (through T3 Code) for most of the code and Codex (GPT 6.1 Sol) for a second review at the end. The work was split across short sessions: the scaffolding, a visual pass, a move to Tailwind with Spanish added, and a final pass against the brief and its likely user. The README's Time section says how long it took.

Claude Code wrote a large part of the code and all of the tests; I wrote the types, modeled the domain, and did cleanup passes.

The agents took care of implementation, validation, and testing, and I drove most of the decisions, namely:

- To profile the user persona
- To implement the offline fallback
- The basic concept of the app (using cards and logos)

I also leveraged AI to include a feature that I would not have included if I had done it manually, i.e. the language selector. I felt it would be useful to show how I use agents to add to my work.

At the end, I made several agents rate my work and ask me questions about it, to see how confident I was in my decisions. One of them was GPT 6.1 Sol, for an opinion from a different model.
