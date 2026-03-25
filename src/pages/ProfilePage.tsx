"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  TrendingUp,
  X,
  Star,
  Target,
  Sparkles,
  ChevronRight,
  Zap,
  Trophy,
  Calendar,
  Activity,
  Gift,
  Medal,
} from "lucide-react"
import {
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { showSuccess, showError } from "../utils/toast"
import { useAuth } from "../contexts/AuthContext"

// Avatar utilities
const AVATARS = [
  "CatAvatar.png",
  "DogAvatar.png",
  "FoxAvatar.png",
  "GiraffeAvatar.png",
  "MantesAvatar.png",
  "OtterAvatar.png",
  "PandaAvatar.png",
  "PenguinAvatar.png",
  "RabbitAvatar.png",
  "TigerAvatar.png",
] as const

const DEFAULT_AVATAR = "PandaAvatar.png"

const getAvatarPath = (avatarName: string): string => {
  if (!avatarName) return `/AvatarImages/${DEFAULT_AVATAR}`
  return `/AvatarImages/${avatarName}`
}


interface UserData {
  name: string
  joinDate: string
  connections: number
  totalCalls: number
  totalHours: number
  peopleHelped: number
  level: number
  levelProgress: number
  weeklyActivity: Array<{ day: string; calls: number; messages: number; mood: number }>
  skills: Array<{ skill: string; value: number }>
  monthlyProgress: Array<{ month: string; score: number }>
  recentActivity: Array<{ icon: any; title: string; time: string; color: string }>
  milestones: Array<{ icon: any; title: string; date: string; completed: boolean; color: string }>
}

const getUserData = (): UserData => {
  // In a real app, this would fetch from an API/database
  // For now, we'll generate data based on stored interactions
  if (typeof window === "undefined") {
    return getDefaultUserData()
  }

  const storedData = sessionStorage.getItem("userData")
  if (storedData) {
    return JSON.parse(storedData)
  }

  return getDefaultUserData()
}

const getDefaultUserData = (): UserData => {
  return {
    name: "CrazyMentis",
    joinDate: "October 2025",
    connections: 0,
    totalCalls: 0,
    totalHours: 0,
    peopleHelped: 0,
    level: 1,
    levelProgress: 0,
    weeklyActivity: [
      { day: "Mon", calls: 0, messages: 0, mood: 5 },
      { day: "Tue", calls: 0, messages: 0, mood: 5 },
      { day: "Wed", calls: 0, messages: 0, mood: 5 },
      { day: "Thu", calls: 0, messages: 0, mood: 5 },
      { day: "Fri", calls: 0, messages: 0, mood: 5 },
      { day: "Sat", calls: 0, messages: 0, mood: 5 },
      { day: "Sun", calls: 0, messages: 0, mood: 5 },
    ],
    skills: [
      { skill: "Communication", value: 0 },
      { skill: "Empathy", value: 0 },
      { skill: "Active Listening", value: 0 },
      { skill: "Support", value: 0 },
      { skill: "Engagement", value: 0 },
    ],
    monthlyProgress: [
      { month: "Jul", score: 0 },
      { month: "Aug", score: 0 },
      { month: "Sep", score: 0 },
      { month: "Oct", score: 0 },
    ],
    recentActivity: [],
    milestones: [
      { icon: Trophy, title: "First Connection", date: "Pending", completed: false, color: "bg-amber-500" },
      { icon: Medal, title: "10 Calls Milestone", date: "Pending", completed: false, color: "bg-blue-500" },
      { icon: Star, title: "Community Star", date: "Pending", completed: false, color: "bg-purple-500" },
      { icon: Gift, title: "50 Hours Goal", date: "Pending", completed: false, color: "bg-pink-500" },
    ],
  }
}

export default function ProfilePage() {
  const { user, updateAvatar } = useAuth()
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string>(getAvatarPath(user?.avatar || DEFAULT_AVATAR))
  const [activeTab, setActiveTab] = useState("overview")
  const [userData, setUserData] = useState<UserData>(getDefaultUserData())

  useEffect(() => {
    if (user?.avatar) {
      setSelectedAvatar(getAvatarPath(user.avatar))
    }
    setUserData(getUserData())
  }, [user?.avatar])

  const handleAvatarSelect = async (avatar: string) => {
    const avatarName = avatar.replace("/AvatarImages/", "").trim()
    try {
      await updateAvatar(avatarName)
      setSelectedAvatar(avatar)
      setShowAvatarModal(false)
      showSuccess(`Your avatar has been changed to ${avatarName.replace(".png", "")}`)
    } catch (err: any) {
      showError(err.message || "Failed to update avatar")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 pt-16">
      <div className="fixed inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Profile Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/40 to-emerald-100/40 rounded-3xl blur-xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              {/* Avatar & Info */}
              <div className="flex items-center gap-6">
                <div
                  className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-blue-200 cursor-pointer group"
                  onClick={() => setShowAvatarModal(true)}
                >
                  <img
                    src={selectedAvatar || "/placeholder.svg"}
                    alt="Profile"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = getAvatarPath(DEFAULT_AVATAR)
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">{userData.level}</span>
                  </div>
                </div>

                <div>
                  <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
                    {user?.username || userData.name}
                  </h1>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700 text-sm font-semibold">Verified</span>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 text-sm font-semibold">Active</span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm">
                    Member since {userData.joinDate} • {userData.connections} connections made
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="text-center bg-blue-50 rounded-2xl px-6 py-4 border border-blue-100">
                  <p className="text-3xl font-black text-slate-900 mb-1">{userData.totalCalls}</p>
                  <p className="text-slate-600 text-xs">Calls</p>
                </div>
                <div className="text-center bg-emerald-50 rounded-2xl px-6 py-4 border border-emerald-100">
                  <p className="text-3xl font-black text-slate-900 mb-1">{userData.totalHours.toFixed(1)}</p>
                  <p className="text-slate-600 text-xs">Hours</p>
                </div>
                <div className="text-center bg-cyan-50 rounded-2xl px-6 py-4 border border-cyan-100">
                  <p className="text-3xl font-black text-slate-900 mb-1">{userData.peopleHelped}</p>
                  <p className="text-slate-600 text-xs">Helped</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto">
          {["overview", "activity", "achievements"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold capitalize transition-all whitespace-nowrap ${activeTab === tab
                  ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-md"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Weekly Activity Chart */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-500" />
                  Weekly Activity
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userData.weeklyActivity}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="day" stroke="rgba(0,0,0,0.4)" />
                    <YAxis stroke="rgba(0,0,0,0.4)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(59,130,246,0.2)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                      labelStyle={{ color: "#1f2937" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorCalls)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorMessages)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Skills Radar */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Target className="w-6 h-6 text-emerald-500" />
                  Skills Assessment
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={userData.skills}>
                    <PolarGrid stroke="rgba(0,0,0,0.1)" />
                    <PolarAngleAxis dataKey="skill" stroke="rgba(0,0,0,0.6)" tick={{ fill: "rgba(0,0,0,0.6)" }} />
                    <PolarRadiusAxis stroke="rgba(0,0,0,0.1)" />
                    <Radar
                      name="Skills"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(59,130,246,0.2)",
                        borderRadius: "12px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Progress Card */}
              <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Level Progress
                </h3>

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg mb-4">
                    <span className="text-4xl font-black text-white">{userData.level}</span>
                  </div>
                  <p className="text-slate-600 text-sm">Current Level</p>
                </div>

                <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                    style={{ width: `${userData.levelProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-slate-600 mb-6">
                  <span>
                    {userData.levelProgress}% to Level {userData.level + 1}
                  </span>
                  <span>{Math.max(0, 10 - userData.totalCalls)} more calls</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Helpful Member</p>
                        <p className="text-slate-600 text-xs">{userData.peopleHelped}+ people helped</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Active Contributor</p>
                        <p className="text-slate-600 text-xs">{userData.connections}+ connections</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-cyan-600" />
                  Monthly Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={userData.monthlyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" stroke="rgba(0,0,0,0.4)" />
                    <YAxis stroke="rgba(0,0,0,0.4)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(59,130,246,0.2)",
                        borderRadius: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ fill: "#06b6d4", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold text-slate-900 mb-8">Recent Activity Timeline</h3>
            {userData.recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No activity yet. Start connecting with people!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userData.recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 hover:bg-slate-100 transition-all"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
                    >
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-600 text-sm">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-slate-900 mb-8">Milestones & Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userData.milestones.map((milestone, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-2xl p-6 border ${milestone.completed ? "bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-14 h-14 ${milestone.color} rounded-xl flex items-center justify-center shadow-lg ${!milestone.completed && "opacity-40"}`}
                      >
                        <milestone.icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold mb-1 ${milestone.completed ? "text-slate-900" : "text-slate-500"}`}>
                          {milestone.title}
                        </p>
                        <p className={`text-sm ${milestone.completed ? "text-slate-600" : "text-slate-400"}`}>
                          {milestone.date}
                        </p>
                        {milestone.completed && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-full">
                              <Star className="w-3 h-3 fill-emerald-700" />
                              Completed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Premium CTA */}
        <div className="mt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/40 to-pink-100/40 rounded-3xl blur-xl"></div>
          <div className="relative bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <span className="bg-purple-200 text-purple-900 font-bold px-3 py-1 rounded-full text-sm">
                    Premium
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Unlock Premium Features</h3>
                <p className="text-slate-600 mb-4 max-w-md">
                  Get priority expert matching, advanced analytics, and exclusive community perks
                </p>
                <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 group">
                  <span>Upgrade Now</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="hidden md:block">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center border border-purple-200">
                  <Trophy className="w-20 h-20 text-yellow-500" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-3xl shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-blue-500" />
                  Choose Your Avatar
                </h3>
                <p className="text-slate-600 mt-2">Pick one that represents your vibe</p>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-3 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mb-8">
              {AVATARS.map((avatar) => {
                const avatarPath = getAvatarPath(avatar)
                const isSelected = selectedAvatar.includes(avatar)
                return (
                  <div
                    key={avatar}
                    className={`relative cursor-pointer transition-all duration-300 group ${isSelected ? "scale-110" : "hover:scale-105"
                      }`}
                    onClick={() => handleAvatarSelect(avatarPath)}
                  >
                    <div
                      className={`rounded-2xl overflow-hidden ${isSelected
                          ? "ring-4 ring-blue-500 shadow-lg shadow-blue-200"
                          : "ring-2 ring-slate-200 hover:ring-blue-300"
                        }`}
                    >
                      <img
                        src={avatarPath || "/placeholder.svg"}
                        alt={avatar.replace(".png", "")}
                        className="w-full aspect-square object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = getAvatarPath(DEFAULT_AVATAR)
                        }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-200">
              <p className="text-slate-600 text-sm">Your avatar is private and secure</p>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
