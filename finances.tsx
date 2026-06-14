import { CheckCircle2, ExternalLink, Phone, Shield, Star, Sparkles, ArrowRight, Car, Anchor, Home, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";

const BASE = import.meta.env.BASE_URL;
const STRATTON_LOGO = `${BASE}stratton-logo.png`;
const MIA_AVATAR    = `${BASE}mia-avatar.png`;
const STRATTON_QUOTE_URL =
  "https://app.strattonfinance.com.au/?rcid=9b783c62-5435-4f78-bfbc-8dc1681dfd41&utm_channel=Referrers&utm_source=MissingCash&utm_medium=Website_Integration&utm_campaign=Erin_Crofton";

function openMia(message?: string) {
  window.dispatchEvent(new CustomEvent("mia:open", { detail: { message } }));
}

const LOAN_CONFIG = {
  car: {
    label: "Car Loan",
    Icon: Car,
    rate: 7.99,
    min: 5_000,
    max: 100_000,
    defaultAmt: 25_000,
    step: 1_000,
    terms: [1, 2, 3, 4, 5],
    defaultTerm: 3,
  },
  boat: {
    label: "Boat Loan",
    Icon: Anchor,
    rate: 8.99,
    min: 10_000,
    max: 150_000,
    defaultAmt: 40_000,
    step: 1_000,
    terms: [2, 3, 5, 7],
    defaultTerm: 3,
  },
  home: {
    label: "Home Loan",
    Icon: Home,
    rate: 6.49,
    min: 100_000,
    max: 1_000_000,
    defaultAmt: 500_000,
    step: 10_000,
    terms: [10, 15, 20, 25, 30],
    defaultTerm: 25,
  },
  personal: {
    label: "Personal Loan",
    Icon: CreditCard,
    rate: 10.99,
    min: 2_000,
    max: 50_000,
    defaultAmt: 15_000,
    step: 500,
    terms: [1, 2, 3, 4, 5],
    defaultTerm: 3,
  },
} as const;

type LoanType = keyof typeof LOAN_CONFIG;

function calcMonthly(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function fmtAUD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export default function Finance() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [consent, setConsent]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [loanType, setLoanType]           = useState<LoanType>("car");
  const [loanAmount, setLoanAmount]       = useState<number>(LOAN_CONFIG.car.defaultAmt);
  const [preferredTerm, setPreferredTerm] = useState<number>(LOAN_CONFIG.car.defaultTerm);
  const [showEstimate, setShowEstimate]   = useState(false);

  usePageSEO({
    title: "Stratton Finance Wanneroo, Perth | Car Loans & Personal Finance — MissingCash",
    description:
      "Get competitive car loans, personal loans and commercial finance through Stratton Finance Wanneroo. Speak with Erin Crofton (08) 9446 9893. ACL 364340 · 40+ lenders · award-winning broker.",
    keywords:
      "Stratton Finance, Stratton Finance Wanneroo, Stratton Finance Perth, Erin Crofton, car loans Perth, car finance Perth, personal loans WA, commercial finance Perth, asset finance, finance broker Perth, MissingCash finance",
    canonical: "https://www.missingcash.com.au/finance",
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id   = "finance-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FinancialService",
      name: "Stratton Finance Wanneroo (via MissingCash)",
      description: "Car loans, personal loans, commercial and asset finance from Stratton Finance.",
      url: "https://www.missingcash.com.au/finance",
      telephone: "+61894469893",
      areaServed: "AU",
      address: { "@type": "PostalAddress", addressLocality: "Wanneroo", addressRegion: "WA", addressCountry: "AU" },
      employee: { "@type": "Person", name: "Erin Crofton", jobTitle: "Finance Consultant" },
      makesOffer: [
        { "@type": "Offer", name: "Car Finance" },
        { "@type": "Offer", name: "Personal Loans" },
        { "@type": "Offer", name: "Commercial Finance" },
        { "@type": "Offer", name: "Asset Finance" },
      ],
    });
    document.head.appendChild(script);
    return () => { document.getElementById("finance-jsonld")?.remove(); };
  }, []);

  useEffect(() => {
    const cfg = LOAN_CONFIG[loanType];
    setLoanAmount(cfg.defaultAmt);
    setPreferredTerm(cfg.defaultTerm);
    setShowEstimate(false);
  }, [loanType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) return;
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData(e.currentTarget);
    const monthly = showEstimate ? calcMonthly(loanAmount, LOAN_CONFIG[loanType].rate, preferredTerm) : undefined;
    try {
      const res = await fetch("/api/finance/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanType,
          loanAmount,
          preferredTerm,
          ...(monthly !== undefined ? { estimatedMonthly: monthly } : {}),
          firstName: fd.get("firstName") as string,
          lastName:  fd.get("lastName")  as string,
          email:     fd.get("email")     as string,
          phone:     fd.get("phone")     as string,
          postcode:  fd.get("postcode")  as string,
          message:   (fd.get("message") as string) || undefined,
        }),
      });
      if (res.ok) {
        setFormSubmitted(true);
      } else {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "Server error");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please call (08) 9446 9893.");
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = LOAN_CONFIG[loanType];

  return (
    <div className="w-full">

      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#060E1C]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(0,193,213,0.07)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_10%_50%,rgba(245,185,66,0.06)_0%,transparent_55%)]" />
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B942]/60 to-transparent" />

        <div className="container mx-auto px-6 max-w-7xl relative z-10 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5B942]/25 bg-[#F5B942]/8 px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B942] animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-[#F5B942]/80 uppercase">Official Finance Partner · Wanneroo WA</span>
              </div>

              <h1 className="text-5xl md:text-6xl xl:text-7xl font-heading tracking-wider leading-[0.95] mb-6 text-white">
                FINANCE WITH
                <span className="block bg-gradient-to-r from-[#F5B942] via-[#FFD466] to-[#F5B942] bg-clip-text text-transparent">
                  STRATTON
                </span>
              </h1>

              <p className="text-lg text-white/60 mb-8 leading-relaxed max-w-lg">
                MissingCash has partnered with <strong className="text-white">Stratton Finance</strong> — one of Australia's most awarded brokers. Access{" "}
                <strong className="text-white">40+ lenders</strong>, expert personal service, and fast approvals.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                {["Car Finance", "Personal Loans", "Commercial Finance", "Asset Finance", "Novated Lease"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#enquire">
                  <Button className="h-13 px-7 rounded-xl bg-[#F5B942] text-[#060E1C] hover:bg-[#FFD466] font-bold tracking-wider text-base shadow-[0_0_28px_rgba(245,185,66,0.35)] transition-all hover:-translate-y-0.5">
                    GET FINANCE READY TODAY
                  </Button>
                </a>
                <button
                  onClick={() => openMia("I'd like to enquire about finance options with Stratton Finance")}
                  className="h-13 px-6 rounded-xl bg-white/5 border border-white/15 text-white font-semibold text-sm flex items-center gap-2 hover:bg-white/10 hover:border-[#F5B942]/40 transition-all"
                >
                  <img src={MIA_AVATAR} alt="Mia" className="w-6 h-6 rounded-full object-cover" />
                  Ask Mia first
                </button>
                <a href="tel:0894469893">
                  <Button variant="outline" className="h-13 px-5 rounded-xl gap-2 border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-transparent text-sm">
                    <Phone className="w-4 h-4 text-[#F5B942]" /> (08) 9446 9893
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#F5B942]/20 blur-3xl scale-125" />
                <div className="relative w-56 h-56 rounded-full ring-2 ring-[#F5B942]/30 ring-offset-4 ring-offset-[#060E1C] overflow-hidden shadow-2xl">
                  <img src={MIA_AVATAR} alt="Mia — MissingCash AI Finance Guide" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 bg-[#060E1C] border border-[#F5B942]/30 rounded-full px-4 py-1.5 shadow-xl">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5B942]" />
                  <span className="text-xs font-bold text-[#F5B942] tracking-wide">MIA · AI Finance Guide</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-xs text-white/30 uppercase tracking-widest">powered by</span>
                <div className="h-px w-12 bg-white/15" />
              </div>

              <div className="bg-white rounded-2xl px-10 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-white/10">
                <img src={STRATTON_LOGO} alt="Stratton Finance" className="h-14 w-auto object-contain" crossOrigin="anonymous" />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <Shield className="w-3 h-3 text-[#F5B942]" /> ACL 364340
                </span>
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <Star className="w-3 h-3 text-[#F5B942]" /> 4.8/5 · 2,500+ reviews
                </span>
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3 h-3 text-[#F5B942]" /> 150,000+ customers
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MIA — AI Finance Guide */}
      <section className="relative py-20 overflow-hidden border-y border-white/6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628] via-[#0D1E35] to-[#0A1628]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_80%_100%_at_100%_50%,rgba(245,185,66,0.06)_0%,transparent_60%)]" />

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">

            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5B942]/20 bg-[#F5B942]/6 px-4 py-1 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#F5B942]" />
                <span className="text-xs font-semibold tracking-widest text-[#F5B942]/70 uppercase">AI-Powered Finance Guidance</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-5 text-white leading-tight">
                MEET MIA — YOUR<br />
                <span className="text-[#F5B942]">FINANCE GUIDE</span>
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl">
                Mia is MissingCash's AI assistant — available 24/7 to explain loan types, compare your options,
                answer finance questions in plain English, and warm-introduce you to Erin at Stratton Finance.
                No jargon. No pressure. Just clear guidance.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Explains loan types</p>
                  <p className="text-white/50 text-xs leading-relaxed">Car loans, personal, commercial — Mia breaks it down simply</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Answers questions</p>
                  <p className="text-white/50 text-xs leading-relaxed">Rates, terms, eligibility, repayments — ask anything</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Connects you to Stratton</p>
                  <p className="text-white/50 text-xs leading-relaxed">Ready? Mia hands you straight to Erin Crofton</p>
                </div>
              </div>
                <button
                onClick={() => openMia("Can you tell me about Stratton Finance and what loans are available?")}
             className="inline-flex items-center gap-3 h-12 px-6 rounded-xl bg-[#F5B942] text-[#060E1C] font-bold hover:bg-[#FFD466] transition-all shadow-[0_0_20px_rgba(245,185,66,0.3)] hover:-translate-y-0.5"
                  >
                <img src={MIA_AVATAR} alt="Mia" className="w-6 h-6 rounded-full object-cover" />
                Chat with Mia Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-[#F5B942]/10 blur-2xl" />
                <div className="relative rounded-3xl overflow-hidden border border-[#F5B942]/20 shadow-2xl w-64">
                  <img src={MIA_AVATAR} alt="Mia — MissingCash AI Finance Guide" className="w-full object-cover aspect-square" crossOrigin="anonymous" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#060E1C] via-[#060E1C]/60 to-transparent px-5 py-5">
                    <p className="text-white font-bold text-sm">Mia</p>
                    <p className="text-[#F5B942] text-xs">AI Finance Guide · MissingCash</p>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-semibold">Online 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT STRATTON FINANCE */}
      <section className="py-20 bg-[#060E1C]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="flex flex-col items-start gap-8">
              <div className="bg-white rounded-2xl px-10 py-8 inline-block shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
                <img src={STRATTON_LOGO} alt="Stratton Finance" className="h-16 w-auto object-contain" crossOrigin="anonymous" />
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-6 w-full">
                <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Finance Consultant · Wanneroo, Perth WA</p>
                <p className="text-white font-bold text-xl mb-1">Erin Crofton</p>
                <a href="tel:0894469893" className="inline-flex items-center gap-2 text-[#F5B942] hover:underline font-semibold mt-1">
                  <Phone className="w-4 h-4" /> (08) 9446 9893
                </a>
                <div className="mt-4 pt-4 border-t border-white/8 flex flex-wrap gap-2">
                  <span className="text-xs text-white/40 bg-white/5 rounded-full px-3 py-1 border border-white/8">ACL 364340</span>
                  <span className="text-xs text-white/40 bg-white/5 rounded-full px-3 py-1 border border-white/8">FBAA Member</span>
                  <span className="text-xs text-white/40 bg-white/5 rounded-full px-3 py-1 border border-white/8">AFCA Member</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-8 text-white">
                ABOUT STRATTON <span className="text-[#F5B942]">FINANCE</span>
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Hi, I'm <strong className="text-white">Erin Crofton</strong>, your dedicated finance consultant at Stratton Finance in Wanneroo, Perth. I take the time to understand your situation and work to deliver positive, efficient finance outcomes for my clients — with honest advice and personal service throughout. Backed by Stratton's award-winning brokerage, here's how we can help:
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F5B942]/15 border border-[#F5B942]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#F5B942]" />
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    Expert brokers providing a <strong className="text-white">personalised service</strong> — they understand your unique finance needs and explore the options right for you
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F5B942]/15 border border-[#F5B942]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#F5B942]" />
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    Access to a select panel of <strong className="text-white">40+ lenders</strong> — allowing Stratton to secure competitive interest rates and loan terms that suit your needs
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F5B942]/15 border border-[#F5B942]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#F5B942]" />
                  </div>
                  <p className="text-white/60 leading-relaxed">
                    Market-leading knowledge and service — with over <strong className="text-white">150,000 customers</strong> and <strong className="text-white">5-star reviews</strong> from more than 2,500 people on ProductReview, you're accessing a premium level of service
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AWARD-WINNING BROKER */}
      <section className="py-20 border-y border-white/6 bg-[#080F1D]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#F5B942]/10 to-[#F5B942]/4 border border-[#F5B942]/20 rounded-2xl p-6 text-center">
                <p className="text-5xl font-heading text-[#F5B942] mb-1">4.8</p>
                <div className="flex justify-center gap-0.5 mb-1">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-[#F5B942] text-[#F5B942]" />)}
                </div>
                <p className="text-white/40 text-xs">2,500+ reviews</p>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-6 text-center">
                <p className="text-5xl font-heading text-white mb-1">150K<span className="text-[#F5B942]">+</span></p>
                <p className="text-white/40 text-xs mt-2">Satisfied customers</p>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-6 text-center">
                <p className="text-5xl font-heading text-white mb-1">40<span className="text-[#F5B942]">+</span></p>
                <p className="text-white/40 text-xs mt-2">Accredited lenders</p>
              </div>
              <div className="bg-gradient-to-br from-[#F5B942]/10 to-[#F5B942]/4 border border-[#F5B942]/20 rounded-2xl p-6 text-center">
                <p className="text-5xl font-heading text-[#F5B942] mb-1">$8B<span className="text-white/60 text-2xl">+</span></p>
                <p className="text-white/40 text-xs mt-2">Finance funded since 1998</p>
              </div>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-5 text-white">
                AWARD-WINNING <span className="text-[#F5B942]">BROKER</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-4">
                Stratton Finance has been awarded <strong className="text-white">Best Car Loans 2021–2025</strong> (ProductReview) and{" "}
                <strong className="text-white">Best Large-Size Brokerage 2023–2024 &amp; Best Car Loans 2025</strong> (WeMoney). With a 4.8/5 rating from 2,500+ reviews and over 150,000 satisfied customers, Stratton is recognised as Australia's leading asset finance broker.
              </p>
              <p className="text-white/60 leading-relaxed mb-8">
                For finance, contact Erin Crofton on{" "}
                <a href="tel:0894469893" className="text-[#F5B942] font-semibold hover:underline">(08) 9446 9893</a>, or get an instant quote below.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#enquire">
                  <Button className="h-11 px-6 rounded-xl bg-[#F5B942] text-[#060E1C] hover:bg-[#FFD466] font-bold tracking-wider shadow-[0_0_20px_rgba(245,185,66,0.3)]">
                    GET A QUOTE TODAY
                  </Button>
                </a>
                <a href="https://www.strattonfinance.com.au/wanneroo" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="h-11 px-5 rounded-xl gap-2 border-white/15 text-white/60 hover:text-white hover:border-white/30 bg-transparent">
                    Visit Stratton Wanneroo <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW STRATTON FINANCE CAN HELP YOU */}
      <section className="py-20 bg-[#060E1C]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading tracking-wider text-white mb-3">
              HOW STRATTON FINANCE <span className="text-[#F5B942]">CAN HELP YOU</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-8 hover:border-[#F5B942]/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#F5B942]/10 border border-[#F5B942]/20 flex items-center justify-center mb-5">
                <span className="text-[#F5B942] font-heading font-bold text-lg">1</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-3 tracking-wide">COMPARE RATES</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                A dedicated finance broker can assist you explore loan interest rate and repayment options from a panel of over 40 lenders.
              </p>
            </div>
            <div className="bg-gradient-to-b from-[#F5B942]/8 to-transparent border border-[#F5B942]/25 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B942]/70 to-transparent" />
              <div className="w-10 h-10 rounded-xl bg-[#F5B942]/15 border border-[#F5B942]/30 flex items-center justify-center mb-5">
                <span className="text-[#F5B942] font-heading font-bold text-lg">2</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-3 tracking-wide">APPLY</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Your dedicated Stratton broker will get to know you and your situation, and complete your application based on your financial details, providing tailored quotes. We'll submit your application and provide clear next steps.
              </p>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-2xl p-8 hover:border-[#F5B942]/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#F5B942]/10 border border-[#F5B942]/20 flex items-center justify-center mb-5">
                <span className="text-[#F5B942] font-heading font-bold text-lg">3</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-3 tracking-wide">BUYING</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                If approved, we can assist with contract walkthroughs and help manage the settlement process, leading you to the exciting moment of supporting your purchase.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-white/40 text-sm mb-3">Not sure where to start? Ask Mia — she'll point you in the right direction.</p>
            <button
              onClick={() => openMia("What finance options does Stratton Finance offer and how does the process work?")}
              className="inline-flex items-center gap-2 text-[#F5B942] hover:text-[#FFD466] font-semibold text-sm transition-colors"
            >
              <img src={MIA_AVATAR} alt="Mia" className="w-5 h-5 rounded-full object-cover" />
              Ask Mia about the process <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* LOAN CALCULATOR + ENQUIRY FORM */}
      <section id="enquire" className="py-20 border-t border-white/6 bg-[#080F1D]">
        <div className="container mx-auto px-6 max-w-5xl">

          <div className="text-center mb-10">
            <div className="bg-white rounded-2xl px-10 py-5 inline-block shadow-[0_8px_30px_rgba(0,0,0,0.4)] mb-8">
              <img src={STRATTON_LOGO} alt="Stratton Finance" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading tracking-wider text-white mb-2">
              GET FINANCE READY TODAY —<br className="hidden sm:block" /> ENQUIRE NOW
            </h2>
            <p className="text-white/40 text-sm mt-3">
              Or{" "}
              <button
                onClick={() => openMia("I have a question about getting finance through Stratton")}
                className="text-[#F5B942] hover:underline font-medium inline-flex items-center gap-1"
              >
                <img src={MIA_AVATAR} alt="Mia" className="w-4 h-4 rounded-full object-cover" /> ask Mia a question first
              </button>
            </p>
          </div>

          {formSubmitted ? (
            <div className="bg-white/4 border border-green-500/30 rounded-2xl p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-heading tracking-wider text-white mb-3">ENQUIRY RECEIVED</h3>
              <p className="text-white/50 mb-6">
                Thanks — the Stratton Finance team will be in touch within one business day.
                For urgent enquiries call{" "}
                <a href="tel:0894469893" className="text-[#F5B942] font-semibold hover:underline">(08) 9446 9893</a>.
              </p>
              <a
                href={STRATTON_QUOTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#00C1D5] hover:text-[#00D4EA] font-semibold text-sm transition-colors"
              >
                Or get an online quote now — no credit score impact <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Step 1: Loan Type */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#F5B942]/30 to-transparent" />
                <p className="text-xs font-bold text-[#F5B942]/70 uppercase tracking-widest mb-4">Step 1 — Select Loan Type</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(LOAN_CONFIG) as LoanType[]).map((type) => {
                    const { label, Icon } = LOAN_CONFIG[type];
                    const active = loanType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLoanType(type)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-semibold transition-all ${
                          active
                            ? "bg-[#F5B942]/15 border-[#F5B942]/60 text-[#F5B942] shadow-[0_0_16px_rgba(245,185,66,0.15)]"
                            : "bg-white/3 border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                        }`}
                        data-testid={`loan-type-${type}`}
                      >
                        <Icon className="w-6 h-6" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Amount */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#F5B942]/30 to-transparent" />
                <p className="text-xs font-bold text-[#F5B942]/70 uppercase tracking-widest mb-4">Step 2 — Loan Amount</p>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-4xl font-heading text-white">{fmtAUD(loanAmount)}</span>
                  <span className="text-white/40 text-sm">{cfg.label} · {cfg.rate}% p.a. indicative</span>
                </div>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={loanAmount}
                  onChange={(e) => { setLoanAmount(Number(e.target.value)); setShowEstimate(false); }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#F5B942] bg-white/10"
                  data-testid="loan-amount-slider"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-white/30 text-xs">{fmtAUD(cfg.min)}</span>
                  <span className="text-white/30 text-xs">{fmtAUD(cfg.max)}</span>
                </div>
                <div className="mt-5">
                  <Button
                    type="button"
                    onClick={() => setShowEstimate(true)}
                    className="h-11 px-6 rounded-xl bg-[#F5B942] text-[#060E1C] hover:bg-[#FFD466] font-bold tracking-wider shadow-[0_0_20px_rgba(245,185,66,0.3)] transition-all hover:-translate-y-0.5"
                    data-testid="btn-get-estimate"
                  >
                    Get My Estimate
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Estimate Table */}
              {showEstimate && (
                <div className="rounded-2xl overflow-hidden border border-[#F5B942]/25 shadow-[0_0_30px_rgba(245,185,66,0.07)]">
                  <div className="px-6 py-4 bg-[#F5B942]/8 border-b border-[#F5B942]/20 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-bold text-sm">Indicative Repayment Estimate</p>
                      <p className="text-white/45 text-xs mt-0.5">
                        {cfg.label} · {fmtAUD(loanAmount)} · {cfg.rate}% p.a. indicative rate
                      </p>
                    </div>
                    <span className="text-xs text-white/30 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                      Click a row to select term
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8 bg-white/2">
                          <th className="px-5 py-3 text-left text-white/40 font-semibold text-xs uppercase tracking-wide">Term</th>
                          <th className="px-5 py-3 text-right text-white/40 font-semibold text-xs uppercase tracking-wide">Monthly</th>
                          <th className="px-5 py-3 text-right text-white/40 font-semibold text-xs uppercase tracking-wide hidden sm:table-cell">Weekly</th>
                          <th className="px-5 py-3 text-right text-white/40 font-semibold text-xs uppercase tracking-wide hidden md:table-cell">Total Interest</th>
                          <th className="px-5 py-3 text-right text-white/40 font-semibold text-xs uppercase tracking-wide">Total Payable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cfg.terms.map((term, idx) => {
                          const monthly     = calcMonthly(loanAmount, cfg.rate, term);
                          const weekly      = (monthly * 12) / 52;
                          const totalPay    = monthly * term * 12;
                          const totalInt    = totalPay - loanAmount;
                          const isSelected  = term === preferredTerm;
                          return (
                            <tr
                              key={term}
                              onClick={() => setPreferredTerm(term)}
                              className={`border-b border-white/6 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#F5B942]/10 border-[#F5B942]/20"
                                  : idx % 2 === 0 ? "bg-white/2 hover:bg-white/4" : "hover:bg-white/4"
                              }`}
                              data-testid={`term-row-${term}`}
                            >
                              <td className="px-5 py-3.5">
                                <span className={`font-semibold ${isSelected ? "text-[#F5B942]" : "text-white/80"}`}>
                                  {term} yr{term !== 1 ? "s" : ""}
                                </span>
                                {isSelected && (
                                  <span className="ml-2 text-[10px] font-bold text-[#F5B942]/70 bg-[#F5B942]/10 border border-[#F5B942]/20 rounded px-1.5 py-0.5">SELECTED</span>
                                )}
                              </td>
                              <td className={`px-5 py-3.5 text-right font-bold ${isSelected ? "text-[#F5B942]" : "text-white"}`}>
                                {fmtAUD(monthly)}<span className="text-white/30 font-normal text-xs">/mo</span>
                              </td>
                              <td className="px-5 py-3.5 text-right text-white/60 hidden sm:table-cell">
                                {fmtAUD(weekly)}<span className="text-white/30 text-xs">/wk</span>
                              </td>
                              <td className="px-5 py-3.5 text-right text-white/50 hidden md:table-cell">{fmtAUD(totalInt)}</td>
                              <td className="px-5 py-3.5 text-right text-white/70">{fmtAUD(totalPay)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-3 bg-white/2 border-t border-white/6">
                    <p className="text-white/30 text-xs">
                      Indicative only. Figures are estimates based on a {cfg.rate}% p.a. rate and do not account for fees, charges, or individual credit assessment. Actual rates will depend on your credit profile and lender.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Your Details */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#F5B942]/40 to-transparent" />
                <p className="text-xs font-bold text-[#F5B942]/70 uppercase tracking-widest mb-1">
                  {showEstimate ? "Step 3" : "Step 2"} — Your Details
                </p>
                <p className="text-white/40 text-sm mb-6">
                  Submit your enquiry and the Stratton Finance team will be in touch within one business day.
                </p>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="fin-first" className="text-white/50 text-sm">First Name *</Label>
                      <Input id="fin-first" name="firstName" required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-[#F5B942]/40" data-testid="input-finance-first-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fin-last" className="text-white/50 text-sm">Last Name *</Label>
                      <Input id="fin-last" name="lastName" required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-[#F5B942]/40" data-testid="input-finance-last-name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="fin-email" className="text-white/50 text-sm">Email *</Label>
                      <Input id="fin-email" name="email" type="email" required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-[#F5B942]/40" data-testid="input-finance-email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fin-phone" className="text-white/50 text-sm">Phone *</Label>
                      <Input id="fin-phone" name="phone" type="tel" required className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 focus:border-[#F5B942]/40" data-testid="input-finance-phone" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fin-postcode" className="text-white/50 text-sm">Postcode *</Label>
                    <Input id="fin-postcode" name="postcode" required maxLength={4} pattern="\d{4}" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11 max-w-[160px] focus:border-[#F5B942]/40" data-testid="input-finance-postcode" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fin-message" className="text-white/50 text-sm">Message</Label>
                    <Textarea id="fin-message" name="message" rows={3} className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none focus:border-[#F5B942]/40" placeholder="Tell us what you're looking to finance (optional)" data-testid="input-finance-message" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#F5B942] shrink-0"
                      required
                      data-testid="checkbox-finance-consent"
                    />
                    <span className="text-xs text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">
                      Select to consent to Stratton Finance's brokers contacting you regarding your enquiry. Your information will be handled in accordance with Stratton Finance's{" "}
                      <a href="https://www.strattonfinance.com.au/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#F5B942] hover:underline">Privacy Policy</a>. *
                    </span>
                  </label>

                  {submitError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{submitError}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      type="submit"
                      disabled={!consent || submitting}
                      className="h-12 px-8 font-bold tracking-widest rounded-xl bg-[#00C1D5] hover:bg-[#00D4EA] text-white disabled:opacity-40 transition-all shadow-[0_4px_20px_rgba(0,193,213,0.3)]"
                      data-testid="button-finance-submit"
                    >
                      {submitting ? "SUBMITTING..." : "SUBMIT ENQUIRY"}
                    </Button>
                    <span className="text-white/20 text-sm hidden sm:inline">— or —</span>
                    <a
                      href={STRATTON_QUOTE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-white/40 hover:text-[#00C1D5] text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Get an online quote with no credit score impact
                    </a>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* IMPORTANT INFORMATION */}
      <section className="py-10 border-t border-white/6 bg-[#060E1C]">
        <div className="container mx-auto px-6 max-w-7xl">
          <p className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-widest">Important Information</p>
          <p className="text-xs text-white/30 leading-relaxed mb-2 max-w-4xl">
            All applications for credit are subject to lender credit assessment and eligibility criteria. Terms, conditions, fees and charges apply. Stratton Finance Pty Ltd Australian Credit Licence 364340.
          </p>
          <p className="text-xs text-white/30 leading-relaxed max-w-4xl">
            MissingCash (ABN 52 347 989 391) may receive a financial benefit for any referrals to Stratton Finance if your loan settles with one of their panel lenders.
          </p>
          <div className="flex flex-wrap items-center gap-5 mt-5">
            <span className="text-xs text-white/25 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#F5B942]/50" /> ACL 364340</span>
            <span className="text-xs text-white/25 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#F5B942]/50" /> FBAA Member 103514</span>
            <span className="text-xs text-white/25 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#F5B942]/50" /> Best Car Loans 2021–2026 · ProductReview</span>
     <span className="text-xs text-white/25 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#F5B942]/50" /> Best Large-Size Brokerage 2023–2024 · WeMoney</span>
    </section>
</div>
  );
