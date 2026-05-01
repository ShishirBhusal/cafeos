import Link from "next/link";
import {
  Coffee,
  ChefHat,
  BarChart3,
  QrCode,
  Receipt,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Counter POS",
    description: "Take orders in 3 taps. Fast enough for rush hour.",
  },
  {
    icon: ChefHat,
    title: "Kitchen Display",
    description: "Real-time tickets. Sound alerts. Never miss an order.",
  },
  {
    icon: QrCode,
    title: "QR Ordering",
    description: "Customers scan and order from their phone.",
  },
  {
    icon: BarChart3,
    title: "Daily Reports",
    description: "Know your profit instantly. Track everything.",
  },
  {
    icon: Users,
    title: "Staff & Shifts",
    description: "Assign roles. Track cash. Close the day right.",
  },
  {
    icon: Coffee,
    title: "Built for Nepal",
    description: "Rs currency. Nepal timezone. Nepali language support.",
  },
];

export default function CafeOSLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-stone-900">CafeOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="text-sm text-stone-500 hover:text-stone-700 font-medium hidden sm:block"
            >
              Explore Cafes
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-stone-600 hover:text-stone-800 font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="text-sm bg-stone-900 hover:bg-stone-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            The operating system
            <br />
            for your cafe
          </h1>
          <p className="text-lg text-stone-500 mt-6 max-w-xl mx-auto">
            Orders, kitchen, payments, reports — everything you need to run
            your cafe, in one place. Free forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link
              href="/auth/login?mode=signup"
              className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium px-7 py-3.5 rounded-lg text-base transition-colors"
            >
              Start free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-700 font-medium px-7 py-3.5 rounded-lg text-base border border-stone-200 transition-colors"
            >
              Explore cafes
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-sm text-stone-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Free forever
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              5 minute setup
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-stone-50 border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900">
              Everything your cafe needs
            </h2>
            <p className="text-stone-500 mt-3 max-w-lg mx-auto">
              Built for how Nepali cafes actually work. Simple, fast, reliable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-stone-100"
              >
                <feature.icon className="w-5 h-5 text-stone-400 mb-3" />
                <h3 className="font-semibold text-stone-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-stone-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 text-center mb-12">
            Up and running in minutes
          </h2>
          <div className="space-y-8">
            {[
              { step: "1", title: "Create your account", desc: "Sign up with email. Takes 30 seconds." },
              { step: "2", title: "Add your menu", desc: "Add items with names and prices. That's it." },
              { step: "3", title: "Start taking orders", desc: "Open the counter and start serving. Orders flow to the kitchen automatically." },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="w-8 h-8 bg-stone-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{item.title}</h3>
                  <p className="text-sm text-stone-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-stone-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to simplify your cafe?
          </h2>
          <p className="text-stone-400 mb-8">
            Join cafes across Nepal already using CafeOS. Free forever.
          </p>
          <Link
            href="/auth/login?mode=signup"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-100 text-stone-900 font-medium px-7 py-3.5 rounded-lg text-base transition-colors"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-stone-900 rounded flex items-center justify-center">
                <Coffee className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-stone-900">CafeOS</span>
              <span className="text-sm text-stone-400 ml-2">Built for Nepal</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-stone-500">
              <Link href="/explore" className="hover:text-stone-700">Explore</Link>
              <Link href="/auth/login" className="hover:text-stone-700">Sign in</Link>
              <Link href="/legal/terms" className="hover:text-stone-700">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-stone-700">Privacy</Link>
            </div>
          </div>
          <p className="text-center text-xs text-stone-400 mt-6">
            &copy; {new Date().getFullYear()} CafeOS. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
