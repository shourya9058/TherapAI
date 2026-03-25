import { MousePointerClick, Video, MessageCircle, Heart } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      number: '01',
      title: 'Click to Connect',
      description: 'Hit the "Start Chatting" button. No sign-up needed. Instant access.'
    },
    {
      icon: Video,
      number: '02',
      title: 'Get Matched',
      description: 'Our system pairs you with someone available right now. Real-time connection.'
    },
    {
      icon: MessageCircle,
      number: '03',
      title: 'Start Talking',
      description: 'Video, voice, or text chat. Choose what makes you comfortable.'
    },
    {
      icon: Heart,
      number: '04',
      title: 'Feel Better',
      description: 'Share, listen, connect. Skip anytime. Your well-being matters most.'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-emerald-50 via-teal-50 to-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            How it works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Getting started is simple. Connect in seconds and start meaningful conversations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl blur-xl opacity-30"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500">
                      <span className="text-sm font-bold text-emerald-600">{step.number}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-emerald-300 to-teal-300 transform -translate-x-1/2"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
