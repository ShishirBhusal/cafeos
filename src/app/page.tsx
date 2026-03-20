import Link from "next/link";
import { 
  Coffee,
  ChefHat,
  BarChart3,
  QrCode,
  Smartphone,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Clock,
  MapPin,
  Receipt,
  TrendingUp,
  Bell
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Ordering",
    description: "Customers scan & order from their phone. No app download needed.",
    color: "bg-orange-100 text-orange-600"
  },
  {
    icon: ChefHat,
    title: "Kitchen Display",
    description: "Real-time ticket system. Never miss an order during rush hour.",
    color: "bg-blue-100 text-blue-600"
  },
  {
    icon: BarChart3,
    title: "Daily Reports",
    description: "Know your profit instantly. Track expenses, revenue, trends.",
    color: "bg-green-100 text-green-600"
  },
  {
    icon: Receipt,
    title: "Smart POS",
    description: "3-tap billing. Fast enough for your busiest Saturday night.",
    color: "bg-purple-100 text-purple-600"
  },
  {
    icon: Users,
    title: "Staff Management",
    description: "Assign roles. Counter, kitchen, waiter - everyone knows their job.",
    color: "bg-pink-100 text-pink-600"
  },
  {
    icon: Bell,
    title: "Order Alerts",
    description: "Sound notifications. Visual cues. Never miss an order.",
    color: "bg-yellow-100 text-yellow-600"
  }
];

const howItWorks = [
  {
    step: "1",
    title: "Sign Up Free",
    description: "Create your cafe account in 2 minutes. No credit card required.",
    icon: Smartphone
  },
  {
    step: "2", 
    title: "Add Your Menu",
    description: "Upload menu items with photos and prices. Easy drag & drop.",
    icon: Coffee
  },
  {
    step: "3",
    title: "Print QR Codes",
    description: "Generate QR codes for each table. Customers scan to order.",
    icon: QrCode
  },
  {
    step: "4",
    title: "Start Serving",
    description: "Orders flow to kitchen display. Bills to counter. Magic!",
    icon: Zap
  }
];

// Testimonials removed - will add real ones when we have verified customer feedback

const stats = [
  { value: "Free", label: "Forever Plan" },
  { value: "Nepal", label: "Built For" },
  { value: "Simple", label: "To Use" },
  { value: "5 min", label: "Setup Time" }
];

export default function CafeOSLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Built for Nepal's Chiya Pasals & Cafes
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Run Your Cafe
              <span className="text-orange-600"> Like a Pro</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              QR ordering. Kitchen display. Daily reports. 
              <br className="hidden md:block" />
              Everything you need to manage your cafe — <strong>free forever</strong>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg border-2 border-gray-200 transition-all"
              >
                <MapPin className="w-5 h-5" />
                Explore Cafes
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Setup in 5 minutes
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-orange-600">{stat.value}</p>
                <p className="text-gray-600 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything Your Cafe Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built specifically for Nepali cafes. Simple, powerful, affordable.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              From signup to first order in under 10 minutes
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Connector Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-orange-200" />
                )}
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <step.icon className="w-10 h-10 text-orange-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why CafeOS Section - Replacing fake testimonials */}
      <section className="py-16 md:py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Nepal's Cafes Choose CafeOS
            </h2>
            <p className="text-xl text-gray-600">
              Purpose-built for how Nepali cafes actually work
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nepali Language</h3>
              <p className="text-gray-600">Interface designed for Nepali cafe workflows. No confusing foreign terms.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rs Currency</h3>
              <p className="text-gray-600">All prices in Nepali Rupees. Reports that make sense for your business.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Support</h3>
              <p className="text-gray-600">WhatsApp support in Nepali. We understand your challenges.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-600 to-orange-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Cafe?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Start managing your cafe smarter today. Free forever, no strings attached.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-orange-50 text-orange-600 font-semibold px-8 py-4 rounded-xl text-lg transition-all"
            >
              Start Free Today
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cafe/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-4 rounded-xl text-lg border-2 border-orange-400 transition-all"
            >
              View Demo Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Secure</p>
                <p className="text-sm text-gray-500">Bank-grade encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">24/7 Support</p>
                <p className="text-sm text-gray-500">We&apos;re always here</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Mobile Friendly</p>
                <p className="text-sm text-gray-500">Works on any device</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Grow Faster</p>
                <p className="text-sm text-gray-500">Data-driven insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-8 h-8 text-orange-500" />
                <span className="text-xl font-bold">CafeOS</span>
              </div>
              <p className="text-gray-400 text-sm">
                Nepal&apos;s smartest cafe management platform. Built with ❤️ in Kathmandu.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/explore" className="hover:text-white">Explore Cafes</Link></li>
                <li><Link href="/auth/register" className="hover:text-white">Get Started</Link></li>
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="https://wa.me/9779801227448" className="hover:text-white">WhatsApp Support</a></li>
                <li><a href="mailto:support@cafeos.com.np" className="hover:text-white">Email Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Cafe Owners</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/cafe/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/auth/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2026 CafeOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
