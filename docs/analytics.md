# Analytics

Masters Compass uses **Microsoft Clarity**, which is free, for heatmaps, session recordings and usage events. The Clarity script loads from `index.html`. Events carry counts and categories only, never names, emails, university names or anything typed into a field. Signed-in users are identified to Clarity by their Firebase uid (Clarity hashes it before sending), so one person on two devices counts once.

## Setup

1. Sign in at [clarity.microsoft.com](https://clarity.microsoft.com) and create a project for `masters-compass.vercel.app`.
2. Copy the project ID from **Settings > Setup** (the short code in the tracking snippet).
3. Put that ID in the Clarity snippet in `index.html` (currently `z7zppitn14`).
4. Clarity masks text that people type into inputs by default. Keep that setting on.

## Events

Clarity custom events don't take parameters, so each event is sent by name and its params are recorded as **custom tags** on the session (for example `program_count = 3`).

| Event | When it fires | Tags |
|---|---|---|
| `sign_up` | First Google sign-in for a new account | `method` |
| `login` | Later sign-ins through the Google button | `method` |
| `return_visit` | A signed-in user opens the app on a later day than their last visit | `days_since_last_visit`, `visit_days`, `program_count` |
| `onboarding_complete` | Finishes the first-run setup | `stage`, `funding`, `country_count`, `test_count` |
| `setup_updated` | Edits the setup later | same as above |
| `program_added` | Adds a university program | `program_count`, `source`, `has_deadline`, `has_fee`, `has_tuition`, `used_ai` |
| `tab_view` | Opens a tab | `tab` |
| `first_university_added` | Once per user, first program | `program_count`, `days_since_signup` |
| `three_universities_added` | Once per user, third program | same |
| `first_deadline_set` | Once per user, first official deadline | same |
| `first_application_submitted` | Once per user, first application moved to Submitted | same |
| `first_offer_received` | Once per user, first application moved to Offer | same |
| `first_loan_added` | Once per user, first loan in Loans & Finances | same |

One-time milestones are stored in the user's workspace (`ms`), so they fire once per person even across devices. People who already used the app before tracking was added have the milestones they had already reached marked as `before-tracking` and do not fire them again.

## Seeing the numbers

1. **Dashboard** shows users, sessions, scroll depth, rage clicks and dead clicks automatically.
2. **Recordings** and **Heatmaps** can be filtered by **Custom events** (for example `first_university_added`) or by **Custom tags**.
3. For resume-style numbers, filter the dashboard by the custom event `first_university_added` to see how many sessions reached it. Use **Returning users** in the dashboard, or filter by `return_visit`, to see who came back on another day.
