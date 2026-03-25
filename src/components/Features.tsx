import { Users, Bot, Award, MessageSquare, SkipForward, Lock } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: Users,
      title: 'Random Matching',
      description: 'Connect with someone new instantly. Skip and match with another person anytime.',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: MessageSquare,
      title: 'Community Posts',
      description: 'Share your thoughts anonymously. Get advice from others who understand.',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      icon: Bot,
      title: 'Meet Lucille',
      description: 'Our AI companion is here 24/7 when you need someone to talk to.',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      icon: Award,
      title: 'Expert Connect',
      description: 'Need professional help? Connect with verified experts in various fields.',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: SkipForward,
      title: 'Skip Freely',
      description: 'Not the right match? Skip to the next person with one click.',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Lock,
      title: 'Secure & Private',
      description: 'Your conversations are private. No data stored. Complete anonymity.',
      color: 'from-teal-500 to-cyan-600'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Everything you need to
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              connect and heal
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you find support and connection when you need it most.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-8 bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
