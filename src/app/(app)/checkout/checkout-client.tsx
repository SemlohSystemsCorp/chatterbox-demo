"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Check,
  Zap,
  Shield,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/top-bar";

interface BoxData {
  id: string;
  short_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  plan: string;
  role: string;
}

interface CheckoutClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  boxes: BoxData[];
}

const planDetails: Record<string, { name: string; price: string; period: string; icon: typeof Zap; features: string[] }> = {
  pro: {
    name: "Pro",
    price: "$8",
    period: "per member/month",
    icon: Zap,
    features: [
      "Unlimited channels & members",
      "50 GB storage",
      "Unlimited message history",
      "All integrations",
      "AI-powered features",
      "Priority support",
      "Custom branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    icon: Building2,
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Audit logs",
      "99.99% SLA",
      "Dedicated support",
      "Custom contracts",
      "Data residency",
      "Advanced compliance",
    ],
  },
};

export function CheckoutClient({ user, boxes }: CheckoutClientProps) {
  const searchParams = useSearchParams();
  const boxShortId = searchParams.get("box") || "";
  const selectedPlan = searchParams.get("plan") || "pro";
  const plan = planDetails[selectedPlan] || planDetails.pro;
  const box = boxes.find((b) => b.short_id === boxShortId);

  const [step, setStep] = useState<"form" | "processing" | "success">("form");

  // Form state
  const [cardName, setCardName] = useState(user.fullName);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [billingEmail, setBillingEmail] = useState(user.email);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("US");
  const [zip, setZip] = useState("");

  // Format card number with spaces
  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  // Format expiry as MM/YY
  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + "/" + digits.slice(2);
    }
    return digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("processing");

    // Simulate processing
    await new Promise((r) => setTimeout(r, 2000));
    setStep("success");
  }

  if (selectedPlan === "enterprise") {
    return (
      <AppShell user={user} boxes={boxes}>
        <TopBar
          title="Enterprise Plan"
          actions={
            <Link
              href={box ? `/box/${box.short_id}/settings` : "/dashboard"}
              className="flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          }
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-[480px] text-center px-6">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-[#276ef1]" />
            <h2 className="mb-2 text-[24px] font-bold text-white">Enterprise Plan</h2>
            <p className="mb-6 text-[14px] text-[#666] leading-relaxed">
              Custom pricing and features tailored for large organizations. Get SSO, audit logs, dedicated support, SLA guarantees, and more.
            </p>
            <div className="mb-6 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5 text-left">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#888]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="mailto:sales@chatterbox.io?subject=Enterprise Plan Inquiry"
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-white px-6 text-[14px] font-semibold text-black transition-colors hover:bg-[#e0e0e0]"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} boxes={boxes}>
      <TopBar
        title="Checkout"
        actions={
          <Link
            href={box ? `/box/${box.short_id}/settings` : "/dashboard"}
            className="flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] text-[#666] transition-colors hover:bg-[#1a1a1a] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[880px] px-6 py-8">
          {step === "success" ? (
            /* ── Success ── */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e]/10">
                <Check className="h-8 w-8 text-[#22c55e]" />
              </div>
              <h2 className="mb-2 text-[24px] font-bold text-white">
                Welcome to {plan.name}!
              </h2>
              <p className="mb-6 text-[14px] text-[#666]">
                Your subscription is now active{box ? ` for ${box.name}` : ""}.
              </p>
              <Link
                href={box ? `/box/${box.short_id}` : "/dashboard"}
                className="h-10 rounded-[8px] bg-white px-6 text-[14px] font-semibold text-black transition-colors hover:bg-[#e0e0e0] flex items-center"
              >
                Go to {box ? "Box" : "Dashboard"}
              </Link>
            </div>
          ) : (
            /* ── Checkout Form ── */
            <div className="flex gap-8">
              {/* Left: Form */}
              <div className="flex-1">
                <h2 className="mb-1 text-[20px] font-bold text-white">Payment Details</h2>
                <p className="mb-6 text-[13px] text-[#555]">
                  Complete your upgrade to {plan.name}.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Card info */}
                  <div className="rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-white">
                      <CreditCard className="h-4 w-4" />
                      Card Information
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[12px] text-[#555]">Name on card</label>
                        <input
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          required
                          className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none"
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] text-[#555]">Card number</label>
                        <input
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          required
                          maxLength={19}
                          inputMode="numeric"
                          className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none font-mono"
                          placeholder="4242 4242 4242 4242"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-[12px] text-[#555]">Expiry</label>
                          <input
                            value={expiry}
                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                            required
                            maxLength={5}
                            inputMode="numeric"
                            className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none font-mono"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div className="w-[120px]">
                          <label className="mb-1 block text-[12px] text-[#555]">CVC</label>
                          <input
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            required
                            maxLength={4}
                            inputMode="numeric"
                            className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none font-mono"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing address */}
                  <div className="rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                    <div className="mb-4 text-[13px] font-semibold text-white">
                      Billing Address
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[12px] text-[#555]">Email</label>
                        <input
                          type="email"
                          value={billingEmail}
                          onChange={(e) => setBillingEmail(e.target.value)}
                          required
                          className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none"
                          placeholder="billing@company.com"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] text-[#555]">Address</label>
                        <input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none"
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-[12px] text-[#555]">City</label>
                          <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none"
                            placeholder="San Francisco"
                          />
                        </div>
                        <div className="w-[100px]">
                          <label className="mb-1 block text-[12px] text-[#555]">ZIP</label>
                          <input
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            required
                            className="h-10 w-full rounded-[8px] border-2 border-transparent bg-[#1a1a1a] px-3 text-[14px] text-white placeholder:text-[#444] focus:border-[#276ef1] focus:outline-none"
                            placeholder="94102"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] text-[#555]">Country</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="h-10 w-full rounded-[8px] border-0 bg-[#1a1a1a] px-3 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-[#276ef1]"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                          <option value="AU">Australia</option>
                          <option value="JP">Japan</option>
                          <option value="BR">Brazil</option>
                          <option value="IN">India</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={step === "processing"}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-white text-[14px] font-semibold text-black transition-colors hover:bg-[#e0e0e0] disabled:opacity-60"
                  >
                    {step === "processing" ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Subscribe to {plan.name}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-[#444]">
                    <Shield className="h-3 w-3" />
                    Secured with 256-bit SSL encryption
                  </div>
                </form>
              </div>

              {/* Right: Order Summary */}
              <div className="w-[280px] shrink-0">
                <div className="sticky top-6 rounded-[12px] border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                  <h3 className="mb-4 text-[14px] font-bold text-white">Order Summary</h3>

                  {box && (
                    <div className="mb-4 flex items-center gap-2 rounded-[8px] bg-[#1a1a1a] p-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white text-[10px] font-bold text-black">
                        {box.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white">{box.name}</div>
                        <div className="text-[11px] capitalize text-[#555]">{box.plan} plan</div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-[14px] font-bold text-white">
                      {plan.name} Plan
                    </span>
                    <div className="text-right">
                      <span className="text-[18px] font-bold text-white">{plan.price}</span>
                      <div className="text-[11px] text-[#555]">{plan.period}</div>
                    </div>
                  </div>

                  <div className="my-3 border-t border-[#1a1a1a]" />

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[12px] text-[#888]">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#22c55e]" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="my-3 border-t border-[#1a1a1a]" />

                  <div className="space-y-1 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-[#555]">Subtotal</span>
                      <span className="text-white">{plan.price}/member/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555]">Tax</span>
                      <span className="text-[#555]">Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[8px] bg-[#1a1a1a] p-3 text-center text-[11px] text-[#555]">
                    You can cancel anytime. Changes take effect at the end of your billing period.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
