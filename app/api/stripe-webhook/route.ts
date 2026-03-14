import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function upsertSubscription(params: {
  waId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  status: string;
  plan?: string;
  currentPeriodEnd?: string | null;
}) {
  const {
    waId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeCheckoutSessionId,
    status,
    plan = "pro",
    currentPeriodEnd = null,
  } = params;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      wa_id: waId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_checkout_session_id: stripeCheckoutSessionId,
      status,
      plan,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "wa_id",
    }
  );

  if (error) {
    console.error("SUBSCRIPTION UPSERT ERROR:", error);
    throw error;
  }
}

function extractWaIdFromSession(session: Stripe.Checkout.Session) {
  const metadataWaId = session.metadata?.wa_id?.trim();
  const phone = session.customer_details?.phone?.trim();

  return metadataWaId || phone || null;
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing Stripe signature or webhook secret" },
        { status: 400 }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("STRIPE SIGNATURE ERROR:", err);
      return NextResponse.json(
        { error: "Invalid Stripe signature" },
        { status: 400 }
      );
    }

    console.log("STRIPE EVENT:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const waId = extractWaIdFromSession(session);

      if (!waId) {
        console.error("No wa_id or phone found in checkout session");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      let currentPeriodEnd: string | null = null;
      let stripeSubscriptionId: string | null = null;

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        stripeSubscriptionId = subscription.id;
        currentPeriodEnd = new Date(
          subscription.items.data[0]?.current_period_end
            ? subscription.items.data[0].current_period_end * 1000
            : Date.now()
        ).toISOString();
      }

      await upsertSubscription({
        waId,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId,
        stripeCheckoutSessionId: session.id,
        status: "active",
        plan: "pro",
        currentPeriodEnd,
      });

      console.log("Subscription activated for:", waId);
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;

      const stripeCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : null;

      if (stripeCustomerId) {
        const { data: existingSub, error } = await supabase
          .from("subscriptions")
          .select("wa_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (error) {
          console.error("SUB LOOKUP ON INVOICE ERROR:", error);
        }

        if (existingSub?.wa_id) {
          let currentPeriodEnd: string | null = null;

          if (invoice.lines?.data?.[0]?.period?.end) {
            currentPeriodEnd = new Date(
              invoice.lines.data[0].period.end * 1000
            ).toISOString();
          }

          await upsertSubscription({
            waId: existingSub.wa_id,
            stripeCustomerId,
            stripeSubscriptionId:
              typeof invoice.parent?.subscription_details?.subscription ===
              "string"
                ? invoice.parent.subscription_details.subscription
                : null,
            status: "active",
            plan: "pro",
            currentPeriodEnd,
          });

          console.log("Invoice paid, subscription renewed for:", existingSub.wa_id);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : null;

      if (stripeCustomerId) {
        const { data: existingSub, error } = await supabase
          .from("subscriptions")
          .select("wa_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (error) {
          console.error("SUB LOOKUP ON DELETE ERROR:", error);
        }

        if (existingSub?.wa_id) {
          await upsertSubscription({
            waId: existingSub.wa_id,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            status: "canceled",
            plan: "pro",
            currentPeriodEnd: null,
          });

          console.log("Subscription canceled for:", existingSub.wa_id);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("STRIPE WEBHOOK ERROR:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}