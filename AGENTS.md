<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Shipping Bill architecture
- Keep the existing TanStack Start router and render the Shipping Bill creation form at `/`; the platform router is fixed.
- Keep Shipping Bill UI, domain validation, typed models, and mock reference data in separate feature modules so responsibilities stay testable.
- Access reference data, party searches, party creation, and submission only through the asynchronous mock service; no backend or new dependencies are required by the assignment.
- Keep mock submissions in service-owned memory, not persistent browser storage; the adapter simulates an API without unrelated infrastructure.
- Use React Hook Form with full nested field paths, preserving fields between tabs; repeatable invoice and item state must remain stable.
