import { Video, Shield, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Anonymous. Instant. Real.</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-slide-up">
          <span className="block">TherapAI</span>
          <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
            Because sometimes
          </span>
          <span className="block bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
            strangers listen better.
          </span>
        </h1>

        <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up delay-100">
          Connect instantly with someone who'll listen, anonymously.
          <br />
          No judgments. No barriers. Just real conversations.
        </p>

        <button
          onClick={() => navigate('/video-call')}
          className="group relative px-12 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-bold rounded-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105 animate-slide-up delay-200"
        >
          <span className="flex items-center space-x-3">
            <Video className="w-6 h-6" />
            <span>Start Chatting Now</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 transition-opacity blur-xl"></div>
        </button>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto animate-fade-in delay-300">
          <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-emerald-300 transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">100% Anonymous</h3>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Your identity stays hidden. Connect without fear of judgment.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-emerald-300 transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Instant Match</h3>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              One click and you're connected. No waiting, no hassle.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:border-emerald-300 transition-all hover:shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Video className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Real Connection</h3>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Face-to-face video chat with people who genuinely care.
            </p>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-center space-x-4 text-sm text-gray-500 animate-fade-in delay-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-medium">2,847 people online now</span>
          </div>
          <span>•</span>
          <span>Join thousands finding support</span>
        </div>
      </div>
    </div>
  );
}
