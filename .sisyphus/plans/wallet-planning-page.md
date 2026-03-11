## Goal

Add a new authenticated page for regional wallet planning and inheritance handoff, plus a new left sidebar menu item.

## Scope

- Add a new route in `client/src/App.tsx`.
- Add a new sidebar menu entry in `client/src/components/DashboardLayout.tsx`.
- Create `client/src/pages/WalletPlanningPage.tsx`.
- Page should follow the existing app style: clean, simple, premium, consistent with Dashboard and AI Strategy.

## Page Structure

1. Header explaining the purpose: help users organize global assets so beneficiaries can trace them if needed.
2. Summary cards describing workflow principles: region separation, beneficiary handoff, review cadence.
3. Five regional wallet sections:
   - 中国大陆
   - 中国香港
   - 美国
   - 新加坡
   - 其他国际
4. Each wallet section should contain three structured blocks:
   - 银行信息 / Bank
   - 证券信息 / Brokerage
   - 保险信息 / Insurance
5. Each block should present example fields in a polished, card-based layout rather than plain forms.

## Design Direction

- Light-touch, elegant, structured dashboard styling.
- Use existing `Card`, `Badge`, and utility classes.
- Avoid heavy interaction; this is a planning/overview page, not a full CRUD form.
- Keep copy bilingual via `useLanguage` pattern already used by other pages.

## Verification

### Automated

1. Run `npx tsc --noEmit` and expect exit code `0`.

### Manual

1. Open the authenticated app shell and verify a new left sidebar menu item appears for the wallet planning page in both zh and en.
2. Click the new menu item and confirm it navigates to the new route and renders the intended page header plus all five regional wallet sections.
3. Toggle language and confirm the sidebar label, page title, subtitle, summary cards, regional wallet titles, and bank / brokerage / insurance labels all switch consistently.
4. On a mobile-width viewport, open the page and confirm the sticky mobile header shows the new page label correctly and the wallet sections stack cleanly without overflow.
5. Revisit `/dashboard` and `/ai-strategy` to confirm the new menu item does not break existing navigation highlighting.
