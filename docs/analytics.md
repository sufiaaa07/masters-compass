# Analytics

Masters Compass sends usage events to **Google Analytics 4** through Firebase Analytics, using the `measurementId` already in the Firebase config (`G-W8J70N0MRY`). Events carry counts and categories only, never names, emails, university names or anything typed into a field. Signed-in users are identified by their Firebase uid so one person on two devices counts once.

## Events

| Event | When it fires | Params |
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

1. In GA4, open **Admin > Events** and mark `first_university_added`, `return_visit` and `first_application_submitted` as **key events**.
2. **Reports > Realtime** or **Admin > DebugView** shows events within seconds, which is the quickest way to check it works.
3. For resume-style numbers, use **Explore > Funnel exploration** with the steps `sign_up` > `onboarding_complete` > `first_university_added` > `return_visit`. That gives "X of N users added a university" and "Y% came back on another day".
4. **Reports > Retention** shows returning users by cohort with no extra setup.

Standard GA4 metrics (users, sessions, engagement time, device, country) are collected automatically.
