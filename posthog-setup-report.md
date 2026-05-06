<wizard-report>
# PostHog post-wizard report

The wizard has completed a server-side PostHog integration for Lex.ai's Supabase Edge Functions using `posthog-node`. A shared PostHog client factory was created at `supabase/functions/_shared/posthog.ts` and injected into four Edge Functions covering the full subscription lifecycle, AI usage, and billing portal access. Every function is configured with `flushAt: 1` and `flushInterval: 0` (short-lived serverless mode) and calls `await posthog.shutdown()` after each capture to guarantee delivery. `$set` properties on subscription events keep each user's `plan` and `stripe_customer_id` in sync in PostHog. Exception capture (`captureException`) was added to the outer `catch` blocks of `create-checkout`, `stripe-webhook`, and `chat`.

| Event | Description | File |
|---|---|---|
| `checkout session created` | User initiated checkout for a paid plan | `supabase/functions/create-checkout/index.ts` |
| `subscription activated` | Subscription activated after checkout completion | `supabase/functions/stripe-webhook/index.ts` |
| `subscription updated` | Subscription plan changed (upgrade/downgrade) | `supabase/functions/stripe-webhook/index.ts` |
| `subscription cancelled` | Subscription cancelled, user reverted to free | `supabase/functions/stripe-webhook/index.ts` |
| `payment failed` | Invoice payment attempt failed | `supabase/functions/stripe-webhook/index.ts` |
| `ai message sent` | User sent a message to the AI legal assistant | `supabase/functions/chat/index.ts` |
| `ai quota exceeded` | User's monthly AI message quota was exceeded | `supabase/functions/chat/index.ts` |
| `billing portal opened` | User accessed the Stripe billing portal | `supabase/functions/customer-portal/index.ts` |

## Next steps

Build a **"Analytics basics"** dashboard in PostHog with the following five insights:

1. **Checkout-to-subscription conversion funnel** — Funnel insight with steps: `checkout session created` → `subscription activated`. Shows what percentage of checkout initiations result in a paid subscription.

2. **AI message volume over time (by plan)** — Trends insight on `ai message sent` broken down by `plan` property. Reveals which plan tier drives the most AI usage.

3. **AI quota exceeded count** — Trends insight on `ai quota exceeded`. Surfaces users hitting their monthly cap — a leading indicator for upgrade opportunities.

4. **Subscription churn over time** — Trends insight on `subscription cancelled`. Tracks cancellation velocity to monitor retention health.

5. **Payment failures over time** — Trends insight on `payment failed`. Monitors dunning risk and failed billing attempts.

To create the dashboard:
1. Go to **Dashboards** in your PostHog project and click **New dashboard** → name it "Analytics basics".
2. Add each insight above using **New insight** within the dashboard.

### Environment variables for Supabase Edge Functions

The PostHog token and host are read from environment variables in each Edge Function:

- `POSTHOG_PROJECT_TOKEN` — your PostHog project token (set in `.env` locally)
- `POSTHOG_HOST` — your PostHog host (set in `.env` locally)

These must also be set in the Supabase dashboard under **Edge Functions → Secrets** for each deployed function to send events in production.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
